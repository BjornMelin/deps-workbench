type CommandResult = {
  exitCode: number;
  stderr: string;
  stdout: Buffer;
};

type StagedEntry = {
  mode: string;
  path: string;
  stagedHash: string;
};

const ZEROED_HASH_PATTERN = /^0+$/;
const INDEX_ENTRY_PATTERN = /^(\d+) ([0-9a-f]+) \d\t(.+)$/;

function runCommand(
  command: string[],
  options: {
    cwd: string;
    input?: Uint8Array | string;
    allowedExitCodes?: number[];
  },
): CommandResult {
  const executable = command[0];

  if (executable === undefined) {
    throw new Error('Expected a command to execute');
  }

  const stdin =
    typeof options.input === 'string'
      ? Buffer.from(options.input)
      : options.input;
  const result = Bun.spawnSync({
    cmd: [executable, ...command.slice(1)],
    cwd: options.cwd,
    stdin,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  if (result.exitCode === null) {
    throw new Error(`${command.join(' ')} terminated unexpectedly`);
  }

  const stdout = Buffer.from(result.stdout);
  const stderrBuffer = Buffer.from(result.stderr);
  const stderr = stderrBuffer.toString('utf8').trimEnd();
  const allowedExitCodes = options.allowedExitCodes ?? [0];

  if (!allowedExitCodes.includes(result.exitCode)) {
    throw new Error(
      stderr.length > 0
        ? stderr
        : `${command.join(' ')} exited with status ${result.exitCode}`,
    );
  }

  return {
    exitCode: result.exitCode,
    stderr,
    stdout,
  };
}

function parseNullTerminated(stdout: Buffer): string[] {
  return stdout
    .toString('utf8')
    .split('\0')
    .filter((value) => value.length > 0);
}

function listStagedEntries(repoRoot: string): StagedEntry[] {
  const stagedPaths = parseNullTerminated(
    runCommand(
      [
        'git',
        'diff',
        '--cached',
        '--name-only',
        '--diff-filter=AM',
        '--no-renames',
        '-z',
        '--',
      ],
      { cwd: repoRoot },
    ).stdout,
  );

  return stagedPaths.flatMap((relativePath) => {
    const indexEntry = parseNullTerminated(
      runCommand(['git', 'ls-files', '--stage', '-z', '--', relativePath], {
        cwd: repoRoot,
      }).stdout,
    )[0];

    if (indexEntry === undefined) {
      return [];
    }

    const match = INDEX_ENTRY_PATTERN.exec(indexEntry);

    if (match === null) {
      throw new Error(`Failed to parse git index entry for ${relativePath}`);
    }

    const [, mode, stagedHash, entryPath] = match;

    if (
      mode === undefined ||
      stagedHash === undefined ||
      entryPath === undefined
    ) {
      throw new Error(`Incomplete git index entry for ${relativePath}`);
    }

    if (mode === '120000' || ZEROED_HASH_PATTERN.test(stagedHash)) {
      return [];
    }

    return [
      {
        mode,
        path: entryPath,
        stagedHash,
      },
    ];
  });
}

function formatBlobWithBiome(
  repoRoot: string,
  relativePath: string,
  contents: Buffer,
): Buffer {
  return runCommand(
    [
      'bunx',
      '--bun',
      'biome',
      'check',
      '--write',
      `--stdin-file-path=${relativePath}`,
    ],
    {
      cwd: repoRoot,
      input: contents,
    },
  ).stdout;
}

function replaceIndexEntry(
  repoRoot: string,
  entry: StagedEntry,
  formattedContents: Buffer,
): string {
  const newHash = runCommand(['git', 'hash-object', '-w', '--stdin'], {
    cwd: repoRoot,
    input: formattedContents,
  })
    .stdout.toString('utf8')
    .trim();

  if (newHash.length === 0) {
    throw new Error(`Formatted output for ${entry.path} was empty`);
  }

  runCommand(
    [
      'git',
      'update-index',
      '--cacheinfo',
      `${entry.mode},${newHash},${entry.path}`,
    ],
    { cwd: repoRoot },
  );

  return newHash;
}

function patchWorkingTree(
  repoRoot: string,
  entry: StagedEntry,
  newHash: string,
): string | null {
  const patch = runCommand(
    [
      'git',
      'diff',
      '--no-ext-diff',
      '--color=never',
      '--unified=0',
      entry.stagedHash,
      newHash,
    ],
    {
      cwd: repoRoot,
    },
  )
    .stdout.toString('utf8')
    .replaceAll(entry.stagedHash, entry.path)
    .replaceAll(newHash, entry.path);

  if (patch.length === 0) {
    return null;
  }

  const applyPatch = runCommand(['git', 'apply', '--unidiff-zero', '-'], {
    cwd: repoRoot,
    input: patch,
    allowedExitCodes: [0, 1],
  });

  if (applyPatch.exitCode === 0) {
    return null;
  }

  return `Working tree copy of ${entry.path} was left unchanged after formatting staged content: ${
    applyPatch.stderr || 'git apply failed'
  }`;
}

/**
 * Formats staged file blobs with Biome while preserving unstaged working-tree changes when possible.
 *
 * @param repoRoot - Repository root path containing the git index and working tree to update.
 * @returns Object with `formattedFiles` listing staged paths updated in the index and `warnings` listing non-fatal worktree patch failures.
 */
export function formatStagedFilesWithBiome(repoRoot: string): {
  formattedFiles: string[];
  warnings: string[];
} {
  const formattedFiles: string[] = [];
  const warnings: string[] = [];

  for (const entry of listStagedEntries(repoRoot)) {
    const stagedContents = runCommand(
      ['git', 'cat-file', '-p', entry.stagedHash],
      {
        cwd: repoRoot,
      },
    ).stdout;
    const formattedContents = formatBlobWithBiome(
      repoRoot,
      entry.path,
      stagedContents,
    );

    if (formattedContents.length === 0 && stagedContents.length > 0) {
      throw new Error(`Biome produced empty output for ${entry.path}`);
    }

    if (formattedContents.equals(stagedContents)) {
      continue;
    }

    const newHash = replaceIndexEntry(repoRoot, entry, formattedContents);
    const warning = patchWorkingTree(repoRoot, entry, newHash);

    if (warning !== null) {
      warnings.push(warning);
    }
    formattedFiles.push(entry.path);
  }

  return {
    formattedFiles,
    warnings,
  };
}

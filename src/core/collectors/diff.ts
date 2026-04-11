import type {
  ArtifactProvenance,
  DiffArtifact,
  DiffPackageEntry,
  SourcePathsArtifact,
} from '../../schemas';
import { diffArtifactSchema } from '../../schemas';
import { type CommandResult, runCommand } from '../exec/run-command';

const GIT_DIFF_TIMEOUT_MS = 60_000;

function diffProvenance(notes: string[] = []): ArtifactProvenance {
  return {
    sourceFamilies: ['git', 'opensrc'],
    commands: [],
    freshness: 'fresh',
    notes,
  };
}

export function diffResultCollected(result: CommandResult): boolean {
  if (result.exitCode === 0) {
    return true;
  }

  return result.exitCode === 1 && result.stdout.length > 0;
}

export function diffResultError(
  result: CommandResult,
  collected: boolean,
): string | undefined {
  if (collected) {
    return undefined;
  }

  if (result.timedOut) {
    return result.stderr || 'git diff --no-index timed out';
  }

  return result.stderr || 'git diff --no-index failed';
}

export function buildDiffPackageEntry(input: {
  entry: SourcePathsArtifact['packages'][number];
  result: CommandResult;
}): DiffPackageEntry {
  const collected = diffResultCollected(input.result);

  return {
    package: input.entry.package,
    status: collected ? 'collected' : 'degraded',
    currentPath: input.entry.current?.path,
    targetPath: input.entry.target?.path,
    summaryText:
      input.result.stdout.length > 0 ? input.result.stdout : undefined,
    error: diffResultError(input.result, collected),
  };
}

/**
 * Runs `git diff --no-index --stat` between resolved current and target source paths when both differ.
 *
 * @param input - Repository root, generation timestamp, and collected source path pairs.
 * @returns Diff artifact describing per-package source tree differences or degraded/skipped states.
 */
export async function collectDiffArtifact(input: {
  repoRoot: string;
  generatedAt: string;
  sourcePaths: SourcePathsArtifact;
}): Promise<DiffArtifact> {
  const provenance = diffProvenance();
  const packages: DiffPackageEntry[] = [];

  for (const entry of input.sourcePaths.packages) {
    if (!entry.current?.path || !entry.target?.path) {
      packages.push({
        package: entry.package,
        status: 'skipped',
        currentPath: entry.current?.path,
        targetPath: entry.target?.path,
        error: 'source diff requires both current and target source paths',
      });
      continue;
    }

    if (entry.current.path === entry.target.path) {
      packages.push({
        package: entry.package,
        status: 'skipped',
        currentPath: entry.current.path,
        targetPath: entry.target.path,
        error: 'current and target source paths are identical',
      });
      continue;
    }

    const command = [
      'git',
      '--no-pager',
      'diff',
      '--no-index',
      '--stat',
      '--summary',
      '--',
      entry.current.path,
      entry.target.path,
    ];
    provenance.commands.push(command.join(' '));
    let result: CommandResult;

    try {
      result = await runCommand(command, {
        cwd: input.repoRoot,
        timeoutMs: GIT_DIFF_TIMEOUT_MS,
      });
    } catch (error) {
      packages.push({
        package: entry.package,
        status: 'degraded',
        currentPath: entry.current.path,
        targetPath: entry.target.path,
        error:
          error instanceof Error ? error.message : 'git diff --no-index failed',
      });
      continue;
    }

    packages.push(
      buildDiffPackageEntry({
        entry,
        result,
      }),
    );
  }

  return diffArtifactSchema.parse({
    schemaVersion: '1',
    family: 'diff',
    generatedAt: input.generatedAt,
    packages,
    provenance,
  });
}

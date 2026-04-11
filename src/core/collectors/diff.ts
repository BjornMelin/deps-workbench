import type {
  ArtifactProvenance,
  DiffArtifact,
  DiffPackageEntry,
  SourcePathsArtifact,
} from '../../schemas';
import { diffArtifactSchema } from '../../schemas';
import { runCommand } from '../exec/run-command';

const GIT_DIFF_TIMEOUT_MS = 60_000;

function diffProvenance(notes: string[] = []): ArtifactProvenance {
  return {
    sourceFamilies: ['git', 'opensrc'],
    commands: [],
    freshness: 'fresh',
    notes,
  };
}

/**
 * Runs `git diff --no-index --stat` between resolved current and target source paths when both differ.
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
    const result = await runCommand(command, {
      cwd: input.repoRoot,
      timeoutMs: GIT_DIFF_TIMEOUT_MS,
    });

    packages.push({
      package: entry.package,
      status:
        result.exitCode === 0 || result.exitCode === 1
          ? 'collected'
          : 'degraded',
      currentPath: entry.current.path,
      targetPath: entry.target.path,
      summaryText:
        result.stdout.length > 0
          ? result.stdout
          : result.stderr.length > 0
            ? result.stderr
            : undefined,
      error:
        result.exitCode === 0 || result.exitCode === 1
          ? undefined
          : result.stderr || 'git diff --no-index failed',
    });
  }

  return diffArtifactSchema.parse({
    schemaVersion: '1',
    family: 'diff',
    generatedAt: input.generatedAt,
    packages,
    provenance,
  });
}

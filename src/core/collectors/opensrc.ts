import type {
  ArtifactProvenance,
  PreflightSummary,
  PrepRequest,
  SourcePathsArtifact,
  SourcePathsPackageEntry,
} from '../../schemas';
import { sourcePathsArtifactSchema } from '../../schemas';
import { type CommandResult, runCommand } from '../exec/run-command';

const OPENSRC_TIMEOUT_MS = 30_000;

/**
 * Strips a semver or tag suffix from a package spec (`name@version` or scoped `@scope/name@version`).
 */
export function stripVersionFromPackageSpec(packageSpec: string): string {
  if (packageSpec.startsWith('@')) {
    const secondAt = packageSpec.indexOf('@', 1);
    return secondAt === -1 ? packageSpec : packageSpec.slice(0, secondAt);
  }

  const atIndex = packageSpec.indexOf('@');
  return atIndex === -1 ? packageSpec : packageSpec.slice(0, atIndex);
}

/**
 * Extracts `owner/repo` from an opensrc cache path containing `/repos/github.com/...`.
 */
export function parseRepositoryFromSourcePath(
  sourcePath: string,
): string | undefined {
  const match = sourcePath.match(
    /\/repos\/github\.com\/([^/]+)\/([^/]+)\/[^/]+$/,
  );
  if (!match) {
    return undefined;
  }

  return `${match[1]}/${match[2]}`;
}

/** Returns the last path segment, treated as the resolved version directory name. */
export function parseVersionFromSourcePath(
  sourcePath: string,
): string | undefined {
  const segments = sourcePath.split('/').filter(Boolean);
  return segments.at(-1);
}

function opensrcProvenance(notes: string[] = []): ArtifactProvenance {
  return {
    sourceFamilies: ['opensrc'],
    commands: [],
    freshness: 'fresh',
    notes,
  };
}

function isOpensrcAvailable(preflight: PreflightSummary): boolean {
  return preflight.tools.some(
    (tool) => tool.toolName === 'opensrc' && tool.available,
  );
}

async function resolveOpensrcPath(command: string[], repoRoot: string) {
  return runCommand(command, {
    cwd: repoRoot,
    timeoutMs: OPENSRC_TIMEOUT_MS,
  });
}

/**
 * Resolves current (and optional target) source tree paths via `opensrc path` for each requested package.
 */
export async function collectSourcePathsArtifact(input: {
  repoRoot: string;
  request: PrepRequest;
  generatedAt: string;
  preflight: PreflightSummary;
}): Promise<SourcePathsArtifact> {
  const packageEntries: SourcePathsPackageEntry[] = [];
  const provenance = opensrcProvenance();

  if (!isOpensrcAvailable(input.preflight)) {
    return sourcePathsArtifactSchema.parse({
      schemaVersion: '1',
      family: 'source_paths',
      generatedAt: input.generatedAt,
      packages: input.request.packages.map((packageName) => ({
        package: packageName,
        status: 'degraded',
        error: 'opensrc unavailable during preflight',
      })),
      provenance: opensrcProvenance(['opensrc unavailable during preflight']),
    });
  }

  for (const packageSpec of input.request.packages) {
    const currentCommand = [
      'opensrc',
      'path',
      packageSpec,
      '--cwd',
      input.repoRoot,
    ];
    const currentResult = await resolveOpensrcPath(
      currentCommand,
      input.repoRoot,
    );
    provenance.commands.push(currentCommand.join(' '));

    let targetResult: CommandResult | undefined;
    if (input.request.targetVersion !== undefined) {
      const targetSpec = `${stripVersionFromPackageSpec(packageSpec)}@${input.request.targetVersion}`;
      const targetCommand = ['opensrc', 'path', targetSpec];
      targetResult = await resolveOpensrcPath(targetCommand, input.repoRoot);
      provenance.commands.push(targetCommand.join(' '));
    }

    const currentPath =
      currentResult.exitCode === 0 ? currentResult.stdout : undefined;
    const targetPath =
      targetResult?.exitCode === 0 ? targetResult.stdout : undefined;
    const repository = parseRepositoryFromSourcePath(
      currentPath ?? targetPath ?? '',
    );

    packageEntries.push({
      package: stripVersionFromPackageSpec(packageSpec),
      repository,
      status:
        currentPath !== undefined &&
        (input.request.targetVersion === undefined || targetPath !== undefined)
          ? 'collected'
          : 'degraded',
      current:
        currentPath !== undefined
          ? {
              spec: packageSpec,
              version: parseVersionFromSourcePath(currentPath),
              path: currentPath,
            }
          : undefined,
      target:
        targetPath !== undefined && input.request.targetVersion !== undefined
          ? {
              spec: `${stripVersionFromPackageSpec(packageSpec)}@${input.request.targetVersion}`,
              version: parseVersionFromSourcePath(targetPath),
              path: targetPath,
            }
          : undefined,
      error:
        currentPath === undefined
          ? currentResult.stderr ||
            'opensrc failed to resolve current source path'
          : targetResult !== undefined && targetPath === undefined
            ? targetResult.stderr ||
              'opensrc failed to resolve target source path'
            : undefined,
    });
  }

  return sourcePathsArtifactSchema.parse({
    schemaVersion: '1',
    family: 'source_paths',
    generatedAt: input.generatedAt,
    packages: packageEntries,
    provenance,
  });
}

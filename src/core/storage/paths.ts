import { mkdir } from 'node:fs/promises';
import path from 'node:path';

/** Resolved absolute paths for repo root and `.local/` subtree roots. */
export type LocalStatePaths = {
  repoRoot: string;
  localRoot: string;
  runsRoot: string;
  cacheRoot: string;
  configRoot: string;
};

/**
 * Resolves `repoRoot` to an absolute path (defaults to current working directory).
 */
export function resolveRepoRoot(repoRoot = process.cwd()): string {
  return path.resolve(repoRoot);
}

/**
 * Computes `.local/`, `runs/`, `cache/`, and `config/` paths under the repository.
 */
export function resolveLocalStatePaths(
  repoRoot = process.cwd(),
): LocalStatePaths {
  const resolvedRepoRoot = resolveRepoRoot(repoRoot);
  const localRoot = path.join(resolvedRepoRoot, '.local');

  return {
    repoRoot: resolvedRepoRoot,
    localRoot,
    runsRoot: path.join(localRoot, 'runs'),
    cacheRoot: path.join(localRoot, 'cache'),
    configRoot: path.join(localRoot, 'config'),
  };
}

/**
 * Returns an absolute path for `candidatePath` relative to `baseDir`, or throws if it escapes `baseDir`.
 *
 * @throws When the resolved path is outside `baseDir` (directory traversal).
 */
export function assertPathWithinBase(
  baseDir: string,
  candidatePath: string,
): string {
  const resolvedBaseDir = resolveRepoRoot(baseDir);
  const resolvedCandidatePath = path.resolve(resolvedBaseDir, candidatePath);
  const relativePath = path.relative(resolvedBaseDir, resolvedCandidatePath);

  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(
      `Path escapes base directory: ${resolvedCandidatePath} is outside ${resolvedBaseDir}`,
    );
  }

  return resolvedCandidatePath;
}

/** Same as {@link assertPathWithinBase} with `baseDir` set to the repository root. */
export function assertPathWithinRepoRoot(
  repoRoot: string,
  candidatePath: string,
): string {
  return assertPathWithinBase(repoRoot, candidatePath);
}

/**
 * Directory for a single run under `.local/runs/<runId>/`.
 */
export function resolveRunDirectory(repoRoot: string, runId: string): string {
  const { runsRoot } = resolveLocalStatePaths(repoRoot);

  return assertPathWithinBase(runsRoot, runId);
}

/**
 * Prep artifact root: `.local/runs/<runId>/prep/`.
 */
export function resolvePrepArtifactRoot(
  repoRoot: string,
  runId: string,
): string {
  return assertPathWithinBase(resolveRunDirectory(repoRoot, runId), 'prep');
}

/**
 * Cache path for an artifact family and stable hash key under `.local/cache/`.
 */
export function resolveCacheDirectory(
  repoRoot: string,
  family: string,
  cacheKey: string,
): string {
  const { cacheRoot } = resolveLocalStatePaths(repoRoot);

  return assertPathWithinBase(cacheRoot, path.join(family, cacheKey));
}

/**
 * Ensures `.local/` subtree directories exist and returns their resolved paths.
 */
export async function ensureLocalStateDirectories(
  repoRoot = process.cwd(),
): Promise<LocalStatePaths> {
  const localStatePaths = resolveLocalStatePaths(repoRoot);

  await Promise.all(
    [
      localStatePaths.localRoot,
      localStatePaths.runsRoot,
      localStatePaths.cacheRoot,
      localStatePaths.configRoot,
    ].map((directoryPath) => mkdir(directoryPath, { recursive: true })),
  );

  return localStatePaths;
}

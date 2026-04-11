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
 *
 * @param repoRoot - Repository root or current working directory when omitted.
 * @returns Absolute repository root path.
 */
export function resolveRepoRoot(repoRoot = process.cwd()): string {
  return path.resolve(repoRoot);
}

/**
 * Computes `.local/`, `runs/`, `cache/`, and `config/` paths under the repository.
 *
 * @param repoRoot - Repository root or current working directory when omitted.
 * @returns Resolved absolute paths for the `.local/` subtree.
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
 * @param baseDir - Base directory that bounds the allowed path.
 * @param candidatePath - Relative or absolute candidate path to validate.
 * @returns Absolute path guaranteed to remain inside `baseDir`.
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

/**
 * Same as {@link assertPathWithinBase} with `baseDir` set to the repository root.
 *
 * @param repoRoot - Repository root used as the safety boundary.
 * @param candidatePath - Relative or absolute candidate path to validate.
 * @returns Absolute path guaranteed to remain inside `repoRoot`.
 */
export function assertPathWithinRepoRoot(
  repoRoot: string,
  candidatePath: string,
): string {
  return assertPathWithinBase(repoRoot, candidatePath);
}

/**
 * Directory for a single run under `.local/runs/<runId>/`.
 *
 * @param repoRoot - Repository root that owns the `.local/runs` subtree.
 * @param runId - Run identifier for one prep/analyze/report cycle.
 * @returns Absolute run directory path.
 */
export function resolveRunDirectory(repoRoot: string, runId: string): string {
  const { runsRoot } = resolveLocalStatePaths(repoRoot);

  return assertPathWithinBase(runsRoot, runId);
}

/**
 * Prep artifact root: `.local/runs/<runId>/prep/`.
 *
 * @param repoRoot - Repository root that owns the `.local/runs` subtree.
 * @param runId - Run identifier for one prep cycle.
 * @returns Absolute prep artifact directory path.
 */
export function resolvePrepArtifactRoot(
  repoRoot: string,
  runId: string,
): string {
  return assertPathWithinBase(resolveRunDirectory(repoRoot, runId), 'prep');
}

/**
 * Cache path for an artifact family and stable hash key under `.local/cache/`.
 *
 * @param repoRoot - Repository root that owns the `.local/cache` subtree.
 * @param family - Artifact family name.
 * @param cacheKey - Stable cache key derived from cache inputs.
 * @returns Absolute cache directory for the requested family/key pair.
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
 *
 * @param repoRoot - Repository root or current working directory when omitted.
 * @returns Resolved `.local/` subtree paths after directory creation.
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

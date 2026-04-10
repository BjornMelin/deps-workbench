import path from 'node:path';
import { mkdir } from 'node:fs/promises';

export type LocalStatePaths = {
  repoRoot: string;
  localRoot: string;
  runsRoot: string;
  cacheRoot: string;
  configRoot: string;
};

export function resolveRepoRoot(repoRoot = process.cwd()): string {
  return path.resolve(repoRoot);
}

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

export function assertPathWithinRepoRoot(
  repoRoot: string,
  candidatePath: string,
): string {
  const resolvedRepoRoot = resolveRepoRoot(repoRoot);
  const resolvedCandidatePath = path.resolve(candidatePath);
  const relativePath = path.relative(resolvedRepoRoot, resolvedCandidatePath);

  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(
      `Path escapes repo root: ${resolvedCandidatePath} is outside ${resolvedRepoRoot}`,
    );
  }

  return resolvedCandidatePath;
}

export function resolveRunDirectory(repoRoot: string, runId: string): string {
  const { runsRoot } = resolveLocalStatePaths(repoRoot);

  return assertPathWithinRepoRoot(repoRoot, path.join(runsRoot, runId));
}

export function resolveCacheDirectory(
  repoRoot: string,
  family: string,
  cacheKey: string,
): string {
  const { cacheRoot } = resolveLocalStatePaths(repoRoot);

  return assertPathWithinRepoRoot(
    repoRoot,
    path.join(cacheRoot, family, cacheKey),
  );
}

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

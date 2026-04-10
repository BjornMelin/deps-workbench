import { mkdir } from 'node:fs/promises';
import path from 'node:path';

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

export function assertPathWithinRepoRoot(
  repoRoot: string,
  candidatePath: string,
): string {
  return assertPathWithinBase(repoRoot, candidatePath);
}

export function resolveRunDirectory(repoRoot: string, runId: string): string {
  const { runsRoot } = resolveLocalStatePaths(repoRoot);

  return assertPathWithinBase(runsRoot, path.join(runsRoot, runId));
}

export function resolveCacheDirectory(
  repoRoot: string,
  family: string,
  cacheKey: string,
): string {
  const { cacheRoot } = resolveLocalStatePaths(repoRoot);

  return assertPathWithinBase(
    cacheRoot,
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

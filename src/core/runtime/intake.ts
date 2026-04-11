import { realpath } from 'node:fs/promises';
import path from 'node:path';
import type { ZodType } from 'zod';
import {
  type DiffArtifact,
  type DocsArtifact,
  diffArtifactSchema,
  docsArtifactSchema,
  type MetaArtifact,
  metaArtifactSchema,
  type PrepManifest,
  prepManifestSchema,
  type ReleasesArtifact,
  releasesArtifactSchema,
  type SignalsArtifact,
  type SourcePathsArtifact,
  signalsArtifactSchema,
  sourcePathsArtifactSchema,
  type UsageArtifact,
  usageArtifactSchema,
} from '../../schemas';
import { readJsonFile } from '../storage/json';
import {
  assertPathWithinBase,
  resolvePrepArtifactRoot,
  resolveRepoRoot,
} from '../storage/paths';

/** Validated prep bundle loaded from one analyzed run. */
export type LoadedPrepBundle = {
  runDirectory: string;
  manifestPath: string;
  manifest: PrepManifest;
  meta: MetaArtifact;
  docs: DocsArtifact;
  releases: ReleasesArtifact;
  sourcePaths: SourcePathsArtifact;
  diff: DiffArtifact;
  usage: UsageArtifact;
  signals: SignalsArtifact;
};

/**
 * Loads a prep bundle using the canonical run id path under `.local/runs`.
 *
 * @param repoRoot - Repository root used to resolve the run directory.
 * @param runId - Prep run identifier under `.local/runs/<runId>`.
 * @returns Loaded and schema-validated prep bundle.
 */
export async function loadPrepBundleFromRunId(
  repoRoot: string,
  runId: string,
): Promise<LoadedPrepBundle> {
  const resolvedRepoRoot = resolveRepoRoot(repoRoot);
  const prepRoot = resolvePrepArtifactRoot(resolvedRepoRoot, runId);
  const manifestPath = path.join(prepRoot, 'manifest.json');

  return loadPrepBundleFromManifest(manifestPath, resolvedRepoRoot, runId);
}

async function readPrepArtifact<T>(
  artifactRoot: string,
  artifactPath: string,
  schema: ZodType<T>,
): Promise<T> {
  const validatedArtifactPath = await resolveRealPathWithinBase(
    artifactRoot,
    artifactPath,
  );

  return readJsonFile(validatedArtifactPath, schema);
}

async function resolveRealPathWithinBase(
  baseDir: string,
  candidatePath: string,
): Promise<string> {
  const resolvedBaseDir = path.resolve(baseDir);
  const resolvedCandidatePath = assertPathWithinBase(baseDir, candidatePath);
  const [realBaseDir, realCandidatePath] = await Promise.all([
    realpath(resolvedBaseDir),
    realpath(resolvedCandidatePath),
  ]);
  const relativePath = path.relative(realBaseDir, realCandidatePath);

  if (
    relativePath === '..' ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(
      `Path escapes base directory: ${realCandidatePath} is outside ${realBaseDir}`,
    );
  }

  return realCandidatePath;
}

/**
 * Loads a prep bundle from an existing manifest path after validating run-bound paths.
 *
 * @param manifestPath - Path to the prep manifest JSON file.
 * @param repoRoot - Repository root used to derive the canonical prep bundle location.
 * @param runId - Prep run identifier expected by the canonical manifest location.
 * @returns Loaded and schema-validated prep bundle.
 * @throws Error - When the manifest path or manifest identity does not match the requested run.
 */
export async function loadPrepBundleFromManifest(
  manifestPath: string,
  repoRoot: string,
  runId: string,
): Promise<LoadedPrepBundle> {
  const expectedPrepRoot = resolvePrepArtifactRoot(repoRoot, runId);
  const expectedManifestPath = path.join(expectedPrepRoot, 'manifest.json');
  const [resolvedManifestPath, expectedRealManifestPath] = await Promise.all([
    resolveRealPathWithinBase(expectedPrepRoot, manifestPath),
    resolveRealPathWithinBase(expectedPrepRoot, expectedManifestPath),
  ]);

  if (resolvedManifestPath !== expectedRealManifestPath) {
    throw new Error(
      `prep manifest path mismatch: expected ${expectedRealManifestPath}, got ${resolvedManifestPath}`,
    );
  }

  const manifest = await readJsonFile(resolvedManifestPath, prepManifestSchema);
  const expectedRepoRoot = resolveRepoRoot(repoRoot);

  if (
    resolveRepoRoot(manifest.repoRoot) !== expectedRepoRoot ||
    manifest.runId !== runId
  ) {
    throw new Error(
      `prep manifest identity mismatch: expected ${expectedRepoRoot}/${runId}, got ${resolveRepoRoot(manifest.repoRoot)}/${manifest.runId}`,
    );
  }

  const artifactRoot = await resolveRealPathWithinBase(
    expectedPrepRoot,
    manifest.artifactRoot,
  );
  const [meta, docs, releases, sourcePaths, diff, usage, signals] =
    await Promise.all([
      readPrepArtifact(
        artifactRoot,
        manifest.artifactFiles.meta,
        metaArtifactSchema,
      ),
      readPrepArtifact(
        artifactRoot,
        manifest.artifactFiles.docs,
        docsArtifactSchema,
      ),
      readPrepArtifact(
        artifactRoot,
        manifest.artifactFiles.releases,
        releasesArtifactSchema,
      ),
      readPrepArtifact(
        artifactRoot,
        manifest.artifactFiles.sourcePaths,
        sourcePathsArtifactSchema,
      ),
      readPrepArtifact(
        artifactRoot,
        manifest.artifactFiles.diff,
        diffArtifactSchema,
      ),
      readPrepArtifact(
        artifactRoot,
        manifest.artifactFiles.usage,
        usageArtifactSchema,
      ),
      readPrepArtifact(
        artifactRoot,
        manifest.artifactFiles.signals,
        signalsArtifactSchema,
      ),
    ]);

  return {
    runDirectory: path.dirname(expectedPrepRoot),
    manifestPath: resolvedManifestPath,
    manifest,
    meta,
    docs,
    releases,
    sourcePaths,
    diff,
    usage,
    signals,
  };
}

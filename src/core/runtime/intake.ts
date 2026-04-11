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
  resolveRunDirectory,
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
  const manifestPath = path.join(
    resolvePrepArtifactRoot(resolvedRepoRoot, runId),
    'manifest.json',
  );

  return loadPrepBundleFromManifest(manifestPath);
}

async function readPrepArtifact<T>(
  artifactRoot: string,
  artifactPath: string,
  schema: ZodType<T>,
): Promise<T> {
  return readJsonFile(assertPathWithinBase(artifactRoot, artifactPath), schema);
}

/**
 * Loads a prep bundle from an existing manifest path after validating run-bound paths.
 *
 * @param manifestPath - Path to the prep manifest JSON file.
 * @returns Loaded and schema-validated prep bundle.
 */
export async function loadPrepBundleFromManifest(
  manifestPath: string,
): Promise<LoadedPrepBundle> {
  const manifest = await readJsonFile(manifestPath, prepManifestSchema);
  const runDirectory = resolveRunDirectory(manifest.repoRoot, manifest.runId);
  const artifactRoot = assertPathWithinBase(
    runDirectory,
    manifest.artifactRoot,
  );

  return {
    runDirectory,
    manifestPath,
    manifest,
    meta: await readPrepArtifact(
      artifactRoot,
      manifest.artifactFiles.meta,
      metaArtifactSchema,
    ),
    docs: await readPrepArtifact(
      artifactRoot,
      manifest.artifactFiles.docs,
      docsArtifactSchema,
    ),
    releases: await readPrepArtifact(
      artifactRoot,
      manifest.artifactFiles.releases,
      releasesArtifactSchema,
    ),
    sourcePaths: await readPrepArtifact(
      artifactRoot,
      manifest.artifactFiles.sourcePaths,
      sourcePathsArtifactSchema,
    ),
    diff: await readPrepArtifact(
      artifactRoot,
      manifest.artifactFiles.diff,
      diffArtifactSchema,
    ),
    usage: await readPrepArtifact(
      artifactRoot,
      manifest.artifactFiles.usage,
      usageArtifactSchema,
    ),
    signals: await readPrepArtifact(
      artifactRoot,
      manifest.artifactFiles.signals,
      signalsArtifactSchema,
    ),
  };
}

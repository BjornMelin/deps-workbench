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
  const runDirectory = resolveRunDirectory(resolvedRepoRoot, runId);
  const manifestPath = path.join(runDirectory, 'prep', 'manifest.json');

  return loadPrepBundleFromManifest(manifestPath, runDirectory);
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
  runDirectory: string,
): Promise<LoadedPrepBundle> {
  const manifest = await readJsonFile(manifestPath, prepManifestSchema);
  const resolvedManifestPath = path.resolve(manifestPath);
  const expectedManifestPath = path.join(runDirectory, 'prep', 'manifest.json');

  if (resolvedManifestPath !== path.resolve(expectedManifestPath)) {
    throw new Error(
      `prep manifest path mismatch: expected ${expectedManifestPath}, got ${resolvedManifestPath}`,
    );
  }

  const artifactRoot = assertPathWithinBase(
    runDirectory,
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
    runDirectory,
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

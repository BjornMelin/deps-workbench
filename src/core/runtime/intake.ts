import path from 'node:path';

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
  resolvePrepArtifactRoot,
  resolveRepoRoot,
  resolveRunDirectory,
} from '../storage/paths';

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

export async function loadPrepBundleFromManifest(
  manifestPath: string,
): Promise<LoadedPrepBundle> {
  const manifest = await readJsonFile(manifestPath, prepManifestSchema);

  return {
    runDirectory: resolveRunDirectory(manifest.repoRoot, manifest.runId),
    manifestPath,
    manifest,
    meta: await readJsonFile(manifest.artifactFiles.meta, metaArtifactSchema),
    docs: await readJsonFile(manifest.artifactFiles.docs, docsArtifactSchema),
    releases: await readJsonFile(
      manifest.artifactFiles.releases,
      releasesArtifactSchema,
    ),
    sourcePaths: await readJsonFile(
      manifest.artifactFiles.sourcePaths,
      sourcePathsArtifactSchema,
    ),
    diff: await readJsonFile(manifest.artifactFiles.diff, diffArtifactSchema),
    usage: await readJsonFile(
      manifest.artifactFiles.usage,
      usageArtifactSchema,
    ),
    signals: await readJsonFile(
      manifest.artifactFiles.signals,
      signalsArtifactSchema,
    ),
  };
}

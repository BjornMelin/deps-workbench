import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import {
  type ArtifactProvenance,
  type DiffArtifact,
  type DocsArtifact,
  diffArtifactSchema,
  docsArtifactSchema,
  type MetaArtifact,
  metaArtifactSchema,
  type PreflightSummary,
  type PrepManifest,
  type PrepRequest,
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
import { collectUsageArtifact } from '../collectors/bun';
import { collectDocsArtifact } from '../collectors/ctx7';
import { collectDiffArtifact } from '../collectors/diff';
import { collectReleasesArtifact } from '../collectors/github';
import { collectSourcePathsArtifact } from '../collectors/opensrc';
import { stripVersionFromPackageSpec } from '../packages/package-spec';
import { loadCheckedInPolicy } from '../policy/load-policy';
import { probeExternalTools } from '../preflight/tools';
import { writeJsonFileAtomic } from '../storage/json';
import {
  ensureLocalStateDirectories,
  resolvePrepArtifactRoot,
  resolveRepoRoot,
} from '../storage/paths';
import { withArtifactCache } from './cache';
import {
  type RepoPackageScan,
  scanRepoForRequestedPackages,
} from './workspace';

/** Inputs for creating a prep bundle (CLI and programmatic). */
export type PrepareBundleOptions = {
  repoRoot?: string;
  mode?: 'triage' | 'research' | 'implementation';
  packages: string[];
  targetVersion?: string;
  runId?: string;
};

/** Typed manifest plus all artifact payloads written under the run directory. */
export type PrepareBundleResult = {
  manifest: PrepManifest;
  meta: MetaArtifact;
  docs: DocsArtifact;
  releases: ReleasesArtifact;
  sourcePaths: SourcePathsArtifact;
  diff: DiffArtifact;
  usage: UsageArtifact;
  signals: SignalsArtifact;
};

function defaultRunId(): string {
  return `run_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`;
}

function applyCacheMetadata<T extends { provenance: ArtifactProvenance }>(
  artifact: T,
  freshness: 'fresh' | 'reused',
  cacheKey: string,
): T {
  return {
    ...artifact,
    provenance: {
      ...artifact.provenance,
      freshness,
      cacheKey,
    },
  };
}

function artifactHasDegradedPackages(
  artifact:
    | DocsArtifact
    | ReleasesArtifact
    | SourcePathsArtifact
    | DiffArtifact
    | UsageArtifact,
): boolean {
  return artifact.packages.some((entry) => entry.status !== 'collected');
}

function indexPackagesByName<T extends { package: string }>(
  entries: T[],
): Map<string, T> {
  return new Map(entries.map((entry) => [entry.package, entry]));
}

function readMajorVersion(version: string | undefined): number | undefined {
  if (!version) {
    return undefined;
  }

  const match = version.match(/(\d+)/);
  if (!match) {
    return undefined;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildMetaArtifact(input: {
  generatedAt: string;
  request: PrepRequest;
  repoScan: RepoPackageScan;
  preflight: PreflightSummary;
  sourcePaths: SourcePathsArtifact;
}): MetaArtifact {
  const sourcePathByPackage = indexPackagesByName(input.sourcePaths.packages);

  return metaArtifactSchema.parse({
    schemaVersion: '1',
    family: 'meta',
    generatedAt: input.generatedAt,
    request: input.request,
    repo: input.repoScan.repo,
    packages: input.repoScan.packages.map((entry) => ({
      ...entry,
      resolvedCurrentVersion: sourcePathByPackage.get(entry.package)?.current
        ?.version,
      targetVersion:
        sourcePathByPackage.get(entry.package)?.target?.version ??
        input.request.targetVersion,
    })),
    preflight: input.preflight,
    provenance: {
      sourceFamilies: ['filesystem'],
      commands: [],
      freshness: 'fresh',
      notes: [],
    },
  });
}

function buildSignalsArtifact(input: {
  generatedAt: string;
  request: PrepRequest;
  repoScan: RepoPackageScan;
  docs: DocsArtifact;
  releases: ReleasesArtifact;
  sourcePaths: SourcePathsArtifact;
  usage: UsageArtifact;
  diff: DiffArtifact;
}): SignalsArtifact {
  const docsByPackage = indexPackagesByName(input.docs.packages);
  const releasesByPackage = indexPackagesByName(input.releases.packages);
  const sourcePathsByPackage = indexPackagesByName(input.sourcePaths.packages);
  const usageByPackage = indexPackagesByName(input.usage.packages);
  const diffByPackage = indexPackagesByName(input.diff.packages);

  const packages = input.repoScan.packages.map((entry) => {
    const docsEntry = docsByPackage.get(entry.package);
    const releasesEntry = releasesByPackage.get(entry.package);
    const sourcePathEntry = sourcePathsByPackage.get(entry.package);
    const usageEntry = usageByPackage.get(entry.package);
    const diffEntry = diffByPackage.get(entry.package);
    const signals: SignalsArtifact['packages'][number]['signals'] = [];

    if (entry.occurrences.length === 0) {
      signals.push({
        name: 'package_not_declared_in_repo',
        severity: 'warn',
        sourceFamily: 'filesystem',
        detail: `${entry.package} was requested but not declared in scanned package.json files`,
      });
    }

    if (input.request.targetVersion === undefined) {
      signals.push({
        name: 'target_version_unspecified',
        severity: 'info',
        sourceFamily: 'filesystem',
        detail: 'prepare ran without an explicit target version',
      });
    }

    if (sourcePathEntry?.status !== 'collected') {
      signals.push({
        name: 'source_path_resolution_incomplete',
        severity: 'error',
        sourceFamily: 'opensrc',
        detail:
          sourcePathEntry?.error ?? 'source paths were not fully resolved',
      });
    }

    if (docsEntry?.status !== 'collected') {
      signals.push({
        name: 'docs_collection_incomplete',
        severity: 'warn',
        sourceFamily: 'ctx7',
        detail:
          docsEntry?.error ?? 'docs artifact is degraded for this package',
      });
    }

    if (releasesEntry?.status !== 'collected') {
      signals.push({
        name: 'release_metadata_incomplete',
        severity: 'warn',
        sourceFamily: 'gh',
        detail:
          releasesEntry?.error ??
          'release metadata artifact is degraded for this package',
      });
    }

    if (usageEntry?.status !== 'collected') {
      signals.push({
        name: 'usage_graph_incomplete',
        severity: 'warn',
        sourceFamily: 'bun',
        detail:
          usageEntry?.error ?? 'usage artifact is degraded for this package',
      });
    }

    if (diffEntry?.status === 'skipped') {
      signals.push({
        name: 'source_diff_skipped',
        severity: 'info',
        sourceFamily: 'git',
        detail: diffEntry.error ?? 'source diff was skipped',
      });
    } else if (diffEntry?.status === 'degraded') {
      signals.push({
        name: 'source_diff_incomplete',
        severity: 'warn',
        sourceFamily: 'git',
        detail: diffEntry.error ?? 'source diff artifact is degraded',
      });
    }

    const currentMajor = readMajorVersion(sourcePathEntry?.current?.version);
    const targetMajor = readMajorVersion(
      sourcePathEntry?.target?.version ?? input.request.targetVersion,
    );
    if (
      currentMajor !== undefined &&
      targetMajor !== undefined &&
      targetMajor > currentMajor
    ) {
      signals.push({
        name: 'major_version_target_requested',
        severity: 'warn',
        sourceFamily: 'opensrc',
        detail: `target major ${targetMajor} exceeds current major ${currentMajor}`,
      });
    }

    return {
      package: entry.package,
      signals,
    };
  });

  return signalsArtifactSchema.parse({
    schemaVersion: '1',
    family: 'signals',
    generatedAt: input.generatedAt,
    packages,
    provenance: {
      sourceFamilies: ['filesystem', 'opensrc', 'ctx7', 'gh', 'bun', 'git'],
      commands: [],
      freshness: 'fresh',
      notes: [],
    },
  });
}

/**
 * Runs preflight, collectors (with cache), builds signals, and writes JSON under `.local/runs/<runId>/prep`.
 *
 * @param options - Repository root, requested packages, mode, optional target version and run id.
 * @returns Manifest and typed artifact payloads written for the requested prep run.
 * @throws Error if options.packages is empty
 * @throws Error if the requested mode is not configured in the policy
 */
export async function createPrepBundle(
  options: PrepareBundleOptions,
): Promise<PrepareBundleResult> {
  const generatedAt = new Date().toISOString();
  const repoRoot = resolveRepoRoot(options.repoRoot ?? process.cwd());
  await ensureLocalStateDirectories(repoRoot);
  const policy = await loadCheckedInPolicy(repoRoot);
  const mode = options.mode ?? policy.modes.default;

  if (options.packages.length === 0) {
    throw new Error('prepare requires at least one package');
  }

  if (!policy.modes.allowed.includes(mode)) {
    throw new Error(`Unsupported prepare mode: ${mode}`);
  }

  const request: PrepRequest = {
    packages: Array.from(
      new Set(
        options.packages.map((packageSpec) =>
          stripVersionFromPackageSpec(packageSpec),
        ),
      ),
    ),
    targetVersion: options.targetVersion,
  };
  const runId = options.runId ?? defaultRunId();
  const artifactRoot = resolvePrepArtifactRoot(repoRoot, runId);
  await mkdir(artifactRoot, { recursive: true });

  const preflightPromise = probeExternalTools();
  const repoScanPromise = scanRepoForRequestedPackages(
    repoRoot,
    request.packages,
  );
  const [preflight, repoScan] = await Promise.all([
    preflightPromise,
    repoScanPromise,
  ]);

  const sourcePathsPromise = withArtifactCache({
    repoRoot,
    family: 'source_paths',
    cacheInput: {
      request,
      repoPackages: repoScan.packages,
      preflight,
    },
    schema: sourcePathsArtifactSchema,
    producer: () =>
      collectSourcePathsArtifact({
        repoRoot,
        request,
        generatedAt,
        preflight,
      }),
  });

  const usagePromise = withArtifactCache({
    repoRoot,
    family: 'usage',
    cacheInput: {
      packages: repoScan.packages,
      preflight,
    },
    schema: usageArtifactSchema,
    producer: () =>
      collectUsageArtifact({
        repoRoot,
        generatedAt,
        preflight,
        packages: repoScan.packages,
      }),
  });

  const [sourcePathsCached, usageCached] = await Promise.all([
    sourcePathsPromise,
    usagePromise,
  ]);

  const docsPromise = withArtifactCache({
    repoRoot,
    family: 'docs',
    cacheInput: {
      request,
      preflight,
    },
    schema: docsArtifactSchema,
    producer: () =>
      collectDocsArtifact({
        repoRoot,
        generatedAt,
        preflight,
        request,
      }),
  });

  const releasesPromise = withArtifactCache({
    repoRoot,
    family: 'releases',
    cacheInput: {
      sourcePaths: sourcePathsCached.value.packages,
      preflight,
    },
    schema: releasesArtifactSchema,
    producer: () =>
      collectReleasesArtifact({
        repoRoot,
        generatedAt,
        preflight,
        sourcePaths: sourcePathsCached.value,
      }),
  });

  const diffPromise = withArtifactCache({
    repoRoot,
    family: 'diff',
    cacheInput: {
      sourcePaths: sourcePathsCached.value.packages,
    },
    schema: diffArtifactSchema,
    producer: () =>
      collectDiffArtifact({
        repoRoot,
        generatedAt,
        sourcePaths: sourcePathsCached.value,
      }),
  });

  const [docsCached, releasesCached, diffCached] = await Promise.all([
    docsPromise,
    releasesPromise,
    diffPromise,
  ]);

  const sourcePaths = applyCacheMetadata(
    sourcePathsCached.value,
    sourcePathsCached.freshness,
    sourcePathsCached.cacheKey,
  );
  const docs = applyCacheMetadata(
    docsCached.value,
    docsCached.freshness,
    docsCached.cacheKey,
  );
  const releases = applyCacheMetadata(
    releasesCached.value,
    releasesCached.freshness,
    releasesCached.cacheKey,
  );
  const usage = applyCacheMetadata(
    usageCached.value,
    usageCached.freshness,
    usageCached.cacheKey,
  );
  const diff = applyCacheMetadata(
    diffCached.value,
    diffCached.freshness,
    diffCached.cacheKey,
  );

  const meta = buildMetaArtifact({
    generatedAt,
    request,
    repoScan,
    preflight,
    sourcePaths,
  });
  const signals = buildSignalsArtifact({
    generatedAt,
    request,
    repoScan,
    docs,
    releases,
    sourcePaths,
    usage,
    diff,
  });

  const artifactFiles = {
    manifest: path.join(artifactRoot, 'manifest.json'),
    meta: path.join(artifactRoot, 'meta.json'),
    docs: path.join(artifactRoot, 'docs.json'),
    releases: path.join(artifactRoot, 'releases.json'),
    sourcePaths: path.join(artifactRoot, 'source_paths.json'),
    diff: path.join(artifactRoot, 'diff.json'),
    usage: path.join(artifactRoot, 'usage.json'),
    signals: path.join(artifactRoot, 'signals.json'),
  };

  const degradedArtifactFamilies = [
    artifactHasDegradedPackages(docs) ? 'docs' : undefined,
    artifactHasDegradedPackages(releases) ? 'releases' : undefined,
    artifactHasDegradedPackages(sourcePaths) ? 'source_paths' : undefined,
    artifactHasDegradedPackages(diff) ? 'diff' : undefined,
    artifactHasDegradedPackages(usage) ? 'usage' : undefined,
  ].filter((value): value is NonNullable<typeof value> => value !== undefined);

  const manifest = prepManifestSchema.parse({
    schemaVersion: '1',
    runId,
    mode,
    repoRoot,
    artifactRoot,
    createdAt: generatedAt,
    request,
    artifactFamilies: [
      'meta',
      'docs',
      'releases',
      'source_paths',
      'diff',
      'usage',
      'signals',
    ],
    degradedArtifactFamilies,
    sourceFamilies: Array.from(
      new Set([
        ...meta.provenance.sourceFamilies,
        ...docs.provenance.sourceFamilies,
        ...releases.provenance.sourceFamilies,
        ...sourcePaths.provenance.sourceFamilies,
        ...diff.provenance.sourceFamilies,
        ...usage.provenance.sourceFamilies,
        ...signals.provenance.sourceFamilies,
      ]),
    ),
    cacheKeys: [
      { family: 'source_paths', key: sourcePathsCached.cacheKey },
      { family: 'docs', key: docsCached.cacheKey },
      { family: 'releases', key: releasesCached.cacheKey },
      { family: 'usage', key: usageCached.cacheKey },
      { family: 'diff', key: diffCached.cacheKey },
    ],
    artifactFiles,
    preflight,
  });

  await Promise.all([
    writeJsonFileAtomic(artifactFiles.meta, meta),
    writeJsonFileAtomic(artifactFiles.docs, docs),
    writeJsonFileAtomic(artifactFiles.releases, releases),
    writeJsonFileAtomic(artifactFiles.sourcePaths, sourcePaths),
    writeJsonFileAtomic(artifactFiles.diff, diff),
    writeJsonFileAtomic(artifactFiles.usage, usage),
    writeJsonFileAtomic(artifactFiles.signals, signals),
  ]);
  await writeJsonFileAtomic(artifactFiles.manifest, manifest);

  return {
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

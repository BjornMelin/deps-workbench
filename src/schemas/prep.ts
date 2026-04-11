/** Zod schemas and inferred types for the prep-phase manifest and per-family artifacts. */

import { z } from 'zod';
import {
  isoTimestampSchema,
  nonEmptyStringSchema,
  pathSchema,
  stringListSchema,
} from './common';
import {
  artifactFamilySchema,
  artifactFreshnessSchema,
  collectionStatusSchema,
  dependencyFieldSchema,
  modeSchema,
  signalSeveritySchema,
  sourceFamilySchema,
  toolRequirementSchema,
} from './enums';

/** Stable cache key entry recorded in the prep manifest. */
export const cacheKeySchema = z
  .object({
    family: artifactFamilySchema,
    key: nonEmptyStringSchema,
  })
  .strict();

/** Packages and optional target version requested for a prep run. */
export const prepRequestSchema = z
  .object({
    packages: z.array(nonEmptyStringSchema).min(1),
    targetVersion: nonEmptyStringSchema.optional(),
  })
  .strict();

/** Canonical JSON artifact file paths written under one prep run directory. */
export const artifactFilesSchema = z
  .object({
    manifest: pathSchema,
    meta: pathSchema,
    docs: pathSchema,
    releases: pathSchema,
    sourcePaths: pathSchema,
    diff: pathSchema,
    usage: pathSchema,
    signals: pathSchema,
  })
  .strict();

/** Single tool probe result recorded during preflight. */
export const toolProbeSchema = z
  .object({
    toolName: nonEmptyStringSchema,
    requirement: toolRequirementSchema,
    available: z.boolean(),
    executablePath: pathSchema.optional(),
    version: nonEmptyStringSchema.optional(),
    notes: stringListSchema.default(() => []),
  })
  .strict();

/** Aggregate preflight summary for required and optional external tools. */
export const preflightSummarySchema = z
  .object({
    tools: z.array(toolProbeSchema).min(1),
    missingRequiredTools: stringListSchema.default(() => []),
    missingOptionalTools: stringListSchema.default(() => []),
  })
  .strict();

/** Source families, commands, freshness, and cache metadata for one artifact. */
export const artifactProvenanceSchema = z
  .object({
    sourceFamilies: z.array(sourceFamilySchema).min(1),
    commands: stringListSchema.default(() => []),
    freshness: artifactFreshnessSchema,
    cacheKey: nonEmptyStringSchema.optional(),
    notes: stringListSchema.default(() => []),
  })
  .strict();

/** One dependency declaration occurrence discovered in a manifest file. */
export const dependencyOccurrenceSchema = z
  .object({
    manifestPath: pathSchema,
    field: dependencyFieldSchema,
    spec: nonEmptyStringSchema,
  })
  .strict();

/** Aggregated dependency metadata for one requested package. */
export const dependencyMetaEntrySchema = z
  .object({
    package: nonEmptyStringSchema,
    occurrences: z.array(dependencyOccurrenceSchema).default(() => []),
    declaredVersions: stringListSchema.default(() => []),
    resolvedCurrentVersion: nonEmptyStringSchema.optional(),
    targetVersion: nonEmptyStringSchema.optional(),
  })
  .strict();

/** Repository-level prep summary including workspaces and lockfile presence. */
export const prepRepoSummarySchema = z
  .object({
    root: pathSchema,
    packageManager: nonEmptyStringSchema.optional(),
    hasWorkspaces: z.boolean(),
    workspaceCount: z.number().int().min(0),
    packageJsonCount: z.number().int().min(1),
    lockfilePresent: z.boolean(),
  })
  .strict();

/** `meta` artifact payload combining request, repo scan, packages, and preflight. */
export const metaArtifactSchema = z
  .object({
    schemaVersion: z.literal('1'),
    family: z.literal('meta'),
    generatedAt: isoTimestampSchema,
    request: prepRequestSchema,
    repo: prepRepoSummarySchema,
    packages: z.array(dependencyMetaEntrySchema).min(1),
    preflight: preflightSummarySchema,
    provenance: artifactProvenanceSchema,
  })
  .strict();

/** Per-package ctx7 docs lookup result or degraded fallback details. */
export const docsPackageEntrySchema = z
  .object({
    package: nonEmptyStringSchema,
    query: nonEmptyStringSchema,
    libraryId: nonEmptyStringSchema.optional(),
    status: collectionStatusSchema,
    raw: z.unknown().optional(),
    error: nonEmptyStringSchema.optional(),
  })
  .strict();

/** `docs` artifact payload containing ctx7 results for requested packages. */
export const docsArtifactSchema = z
  .object({
    schemaVersion: z.literal('1'),
    family: z.literal('docs'),
    generatedAt: isoTimestampSchema,
    packages: z.array(docsPackageEntrySchema).min(1),
    provenance: artifactProvenanceSchema,
  })
  .strict();

/** One normalized GitHub release row captured from `gh release list`. */
export const releaseItemSchema = z
  .object({
    name: nonEmptyStringSchema.optional(),
    tagName: nonEmptyStringSchema,
    publishedAt: nonEmptyStringSchema.optional(),
    isLatest: z.boolean(),
  })
  .strict();

/** Per-package GitHub release metadata or degradation details. */
export const releasesPackageEntrySchema = z
  .object({
    package: nonEmptyStringSchema,
    repository: nonEmptyStringSchema.optional(),
    status: collectionStatusSchema,
    releases: z.array(releaseItemSchema).default(() => []),
    rawText: z.string().optional(),
    error: nonEmptyStringSchema.optional(),
  })
  .strict();

/** `releases` artifact payload containing GitHub release metadata by package. */
export const releasesArtifactSchema = z
  .object({
    schemaVersion: z.literal('1'),
    family: z.literal('releases'),
    generatedAt: isoTimestampSchema,
    packages: z.array(releasesPackageEntrySchema).min(1),
    provenance: artifactProvenanceSchema,
  })
  .strict();

/** Resolved source tree snapshot for a package spec and optional version. */
export const sourceSnapshotSchema = z
  .object({
    spec: nonEmptyStringSchema,
    version: nonEmptyStringSchema.optional(),
    path: pathSchema,
  })
  .strict();

/** Per-package current and optional target source path resolution details. */
export const sourcePathsPackageEntrySchema = z
  .object({
    package: nonEmptyStringSchema,
    repository: nonEmptyStringSchema.optional(),
    status: collectionStatusSchema,
    current: sourceSnapshotSchema.optional(),
    target: sourceSnapshotSchema.optional(),
    error: nonEmptyStringSchema.optional(),
  })
  .strict();

/** `source_paths` artifact payload containing opensrc path resolution results. */
export const sourcePathsArtifactSchema = z
  .object({
    schemaVersion: z.literal('1'),
    family: z.literal('source_paths'),
    generatedAt: isoTimestampSchema,
    packages: z.array(sourcePathsPackageEntrySchema).min(1),
    provenance: artifactProvenanceSchema,
  })
  .strict();

/** Per-package diff summary between resolved current and target source trees. */
export const diffPackageEntrySchema = z
  .object({
    package: nonEmptyStringSchema,
    status: collectionStatusSchema,
    currentPath: pathSchema.optional(),
    targetPath: pathSchema.optional(),
    summaryText: z.string().optional(),
    error: nonEmptyStringSchema.optional(),
  })
  .strict();

/** `diff` artifact payload containing source diff summaries by package. */
export const diffArtifactSchema = z
  .object({
    schemaVersion: z.literal('1'),
    family: z.literal('diff'),
    generatedAt: isoTimestampSchema,
    packages: z.array(diffPackageEntrySchema).min(1),
    provenance: artifactProvenanceSchema,
  })
  .strict();

/** Per-package `bun why` and audit collection result. */
export const usagePackageEntrySchema = z
  .object({
    package: nonEmptyStringSchema,
    status: collectionStatusSchema,
    whyText: z.string().optional(),
    auditJson: z.unknown().optional(),
    declaredVersions: stringListSchema.default(() => []),
    error: nonEmptyStringSchema.optional(),
  })
  .strict();

/** `usage` artifact payload containing Bun dependency graph evidence. */
export const usageArtifactSchema = z
  .object({
    schemaVersion: z.literal('1'),
    family: z.literal('usage'),
    generatedAt: isoTimestampSchema,
    packages: z.array(usagePackageEntrySchema).min(1),
    provenance: artifactProvenanceSchema,
  })
  .strict();

/** One derived signal attached to a requested package. */
export const signalEntrySchema = z
  .object({
    name: nonEmptyStringSchema,
    severity: signalSeveritySchema,
    sourceFamily: sourceFamilySchema,
    detail: nonEmptyStringSchema.optional(),
  })
  .strict();

/** Per-package list of derived upgrade-prep signals. */
export const signalsPackageEntrySchema = z
  .object({
    package: nonEmptyStringSchema,
    signals: z.array(signalEntrySchema).default(() => []),
  })
  .strict();

/** `signals` artifact payload containing derived diagnostics by package. */
export const signalsArtifactSchema = z
  .object({
    schemaVersion: z.literal('1'),
    family: z.literal('signals'),
    generatedAt: isoTimestampSchema,
    packages: z.array(signalsPackageEntrySchema).min(1),
    provenance: artifactProvenanceSchema,
  })
  .strict();

/** Top-level prep manifest tying together artifact families, files, and preflight. */
export const prepManifestSchema = z
  .object({
    schemaVersion: z.literal('1'),
    runId: nonEmptyStringSchema,
    mode: modeSchema,
    repoRoot: pathSchema,
    artifactRoot: pathSchema,
    createdAt: isoTimestampSchema,
    request: prepRequestSchema,
    artifactFamilies: z.array(artifactFamilySchema).min(1),
    degradedArtifactFamilies: z.array(artifactFamilySchema).default(() => []),
    sourceFamilies: z.array(sourceFamilySchema).min(1),
    cacheKeys: z.array(cacheKeySchema).default(() => []),
    artifactFiles: artifactFilesSchema,
    preflight: preflightSummarySchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    const artifactFamilies = new Set(value.artifactFamilies);
    const missingDegradedFamilies = value.degradedArtifactFamilies.filter(
      (family) => !artifactFamilies.has(family),
    );

    if (missingDegradedFamilies.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['degradedArtifactFamilies'],
        message:
          'degradedArtifactFamilies must be a subset of artifactFamilies',
      });
    }
  });

/** Packages and optional target version requested for a prep run. */
export type PrepRequest = z.infer<typeof prepRequestSchema>;
/** One external CLI tool: availability, version string, and probe notes. */
export type ToolProbe = z.infer<typeof toolProbeSchema>;
/** Tool probes plus lists of missing required vs optional tools. */
export type PreflightSummary = z.infer<typeof preflightSummarySchema>;
/** Where artifact data came from, cache freshness, and optional cache key. */
export type ArtifactProvenance = z.infer<typeof artifactProvenanceSchema>;
/** Single dependency declaration in a `package.json` field. */
export type DependencyOccurrence = z.infer<typeof dependencyOccurrenceSchema>;
/** Per-package dependency metadata aggregated from the repo scan. */
export type DependencyMetaEntry = z.infer<typeof dependencyMetaEntrySchema>;
/** Repository-level summary (root path, workspaces, lockfile). */
export type PrepRepoSummary = z.infer<typeof prepRepoSummarySchema>;
/** Per-package docs resolution via ctx7 (or degraded probe). */
export type DocsPackageEntry = z.infer<typeof docsPackageEntrySchema>;
/** Per-package GitHub release list (or error state). */
export type ReleasesPackageEntry = z.infer<typeof releasesPackageEntrySchema>;
/** Per-package opensrc-resolved source paths for current and optional target versions. */
export type SourcePathsPackageEntry = z.infer<
  typeof sourcePathsPackageEntrySchema
>;
/** Per-package `git diff --no-index` summary between resolved trees. */
export type DiffPackageEntry = z.infer<typeof diffPackageEntrySchema>;
/** Per-package `bun why` / audit output. */
export type UsagePackageEntry = z.infer<typeof usagePackageEntrySchema>;
/** Top-level prep run manifest: paths, artifact list, preflight, and degraded families. */
export type PrepManifest = z.infer<typeof prepManifestSchema>;
/** Consolidated repo and dependency metadata for the `meta` artifact family. */
export type MetaArtifact = z.infer<typeof metaArtifactSchema>;
/** `docs` artifact family: ctx7 library/docs payloads per package. */
export type DocsArtifact = z.infer<typeof docsArtifactSchema>;
/** `releases` artifact family: `gh release list` results per package. */
export type ReleasesArtifact = z.infer<typeof releasesArtifactSchema>;
/** `source_paths` artifact family: opensrc path resolution per package. */
export type SourcePathsArtifact = z.infer<typeof sourcePathsArtifactSchema>;
/** `diff` artifact family: git diff stat between current and target trees. */
export type DiffArtifact = z.infer<typeof diffArtifactSchema>;
/** `usage` artifact family: bun audit / why traces per package. */
export type UsageArtifact = z.infer<typeof usageArtifactSchema>;
/** Cross-artifact signals derived for each requested package. */
export type SignalsArtifact = z.infer<typeof signalsArtifactSchema>;

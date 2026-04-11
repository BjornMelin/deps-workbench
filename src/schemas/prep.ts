/**
 * @fileoverview Zod schemas and inferred types for the prep-phase manifest and per-family artifacts.
 */

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

export const cacheKeySchema = z
  .object({
    family: artifactFamilySchema,
    key: nonEmptyStringSchema,
  })
  .strict();

export const prepRequestSchema = z
  .object({
    packages: z.array(nonEmptyStringSchema).min(1),
    targetVersion: nonEmptyStringSchema.optional(),
  })
  .strict();

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

export const toolProbeSchema = z
  .object({
    toolName: nonEmptyStringSchema,
    requirement: toolRequirementSchema,
    available: z.boolean(),
    executablePath: pathSchema.optional(),
    version: nonEmptyStringSchema.optional(),
    notes: stringListSchema.default([]),
  })
  .strict();

export const preflightSummarySchema = z
  .object({
    tools: z.array(toolProbeSchema).min(1),
    missingRequiredTools: stringListSchema.default([]),
    missingOptionalTools: stringListSchema.default([]),
  })
  .strict();

export const artifactProvenanceSchema = z
  .object({
    sourceFamilies: z.array(sourceFamilySchema).min(1),
    commands: stringListSchema.default([]),
    freshness: artifactFreshnessSchema,
    cacheKey: nonEmptyStringSchema.optional(),
    notes: stringListSchema.default([]),
  })
  .strict();

export const dependencyOccurrenceSchema = z
  .object({
    manifestPath: pathSchema,
    field: dependencyFieldSchema,
    spec: nonEmptyStringSchema,
  })
  .strict();

export const dependencyMetaEntrySchema = z
  .object({
    package: nonEmptyStringSchema,
    occurrences: z.array(dependencyOccurrenceSchema).default([]),
    declaredVersions: stringListSchema.default([]),
    resolvedCurrentVersion: nonEmptyStringSchema.optional(),
    targetVersion: nonEmptyStringSchema.optional(),
  })
  .strict();

export const prepRepoSummarySchema = z
  .object({
    root: pathSchema,
    packageManager: nonEmptyStringSchema.optional(),
    hasWorkspaces: z.boolean(),
    workspaceCount: z.number().int().min(1),
    packageJsonCount: z.number().int().min(1),
    lockfilePresent: z.boolean(),
  })
  .strict();

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

export const docsArtifactSchema = z
  .object({
    schemaVersion: z.literal('1'),
    family: z.literal('docs'),
    generatedAt: isoTimestampSchema,
    packages: z.array(docsPackageEntrySchema).min(1),
    provenance: artifactProvenanceSchema,
  })
  .strict();

export const releaseItemSchema = z
  .object({
    name: nonEmptyStringSchema.optional(),
    tagName: nonEmptyStringSchema,
    publishedAt: nonEmptyStringSchema.optional(),
    isLatest: z.boolean(),
  })
  .strict();

export const releasesPackageEntrySchema = z
  .object({
    package: nonEmptyStringSchema,
    repository: nonEmptyStringSchema.optional(),
    status: collectionStatusSchema,
    releases: z.array(releaseItemSchema).default([]),
    rawText: z.string().optional(),
    error: nonEmptyStringSchema.optional(),
  })
  .strict();

export const releasesArtifactSchema = z
  .object({
    schemaVersion: z.literal('1'),
    family: z.literal('releases'),
    generatedAt: isoTimestampSchema,
    packages: z.array(releasesPackageEntrySchema).min(1),
    provenance: artifactProvenanceSchema,
  })
  .strict();

export const sourceSnapshotSchema = z
  .object({
    spec: nonEmptyStringSchema,
    version: nonEmptyStringSchema.optional(),
    path: pathSchema,
  })
  .strict();

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

export const sourcePathsArtifactSchema = z
  .object({
    schemaVersion: z.literal('1'),
    family: z.literal('source_paths'),
    generatedAt: isoTimestampSchema,
    packages: z.array(sourcePathsPackageEntrySchema).min(1),
    provenance: artifactProvenanceSchema,
  })
  .strict();

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

export const diffArtifactSchema = z
  .object({
    schemaVersion: z.literal('1'),
    family: z.literal('diff'),
    generatedAt: isoTimestampSchema,
    packages: z.array(diffPackageEntrySchema).min(1),
    provenance: artifactProvenanceSchema,
  })
  .strict();

export const usagePackageEntrySchema = z
  .object({
    package: nonEmptyStringSchema,
    status: collectionStatusSchema,
    whyText: z.string().optional(),
    auditJson: z.unknown().optional(),
    declaredVersions: stringListSchema.default([]),
    error: nonEmptyStringSchema.optional(),
  })
  .strict();

export const usageArtifactSchema = z
  .object({
    schemaVersion: z.literal('1'),
    family: z.literal('usage'),
    generatedAt: isoTimestampSchema,
    packages: z.array(usagePackageEntrySchema).min(1),
    provenance: artifactProvenanceSchema,
  })
  .strict();

export const signalEntrySchema = z
  .object({
    name: nonEmptyStringSchema,
    severity: signalSeveritySchema,
    sourceFamily: sourceFamilySchema,
    detail: nonEmptyStringSchema.optional(),
  })
  .strict();

export const signalsPackageEntrySchema = z
  .object({
    package: nonEmptyStringSchema,
    signals: z.array(signalEntrySchema).default([]),
  })
  .strict();

export const signalsArtifactSchema = z
  .object({
    schemaVersion: z.literal('1'),
    family: z.literal('signals'),
    generatedAt: isoTimestampSchema,
    packages: z.array(signalsPackageEntrySchema).min(1),
    provenance: artifactProvenanceSchema,
  })
  .strict();

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
    degradedArtifactFamilies: z.array(artifactFamilySchema).default([]),
    sourceFamilies: z.array(sourceFamilySchema).min(1),
    cacheKeys: z.array(cacheKeySchema).default([]),
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

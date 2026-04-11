/** Zod enums for typed string literals in manifests, artifacts, and policy. */

import { z } from 'zod';

/** Allowed operator modes for prep, analysis, and run orchestration. */
export const modeSchema = z.enum(['triage', 'research', 'implementation']);

/** Model routing tiers used by analysis policy. */
export const modelTierSchema = z.enum(['nano', 'mini', 'full']);

/** Canonical change intents emitted in implementation checklists. */
export const changeIntentSchema = z.enum([
  'replace',
  'delete',
  'introduce',
  'verify_only',
]);

/** Claim certainty buckets written into result artifacts. */
export const claimBucketSchema = z.enum(['SUPPORTED', 'UNVERIFIED']);

/** Recovery record states for the single bounded automatic hop. */
export const recoveryStatusSchema = z.enum([
  'attempted',
  'succeeded',
  'skipped',
]);

/** Automatic recovery actions permitted after degraded analysis runs. */
export const recoveryActionSchema = z.enum([
  'refresh_docs',
  'refresh_releases',
  'retry_one_failed_artifact_family',
  're_run_with_escalation',
]);

/** Framework identifiers used for ecosystem-specific enrichment. */
export const frameworkEnrichmentSchema = z.enum([
  'react',
  'next',
  'expo',
  'convex',
]);

/** High-level outcome classes for analysis result bundles. */
export const outcomeClassSchema = z.enum([
  'ready_to_implement',
  'review_required',
  'blocked',
  'degraded_reference_only',
]);

/** Primary operator action recommended after analysis completes. */
export const primaryActionSchema = z.enum([
  'implement_now',
  'review_key_claims',
  'refresh_missing_evidence',
  're_run_with_escalation',
  'stop_blocked',
]);

/** Canonical prep artifact families written under each run directory. */
export const artifactFamilySchema = z.enum([
  'meta',
  'docs',
  'releases',
  'source_paths',
  'diff',
  'usage',
  'signals',
]);

/** Provenance source families recorded in artifact metadata. */
export const sourceFamilySchema = z.enum([
  'bun',
  'opensrc',
  'ctx7',
  'gh',
  'filesystem',
  'git',
]);

/** Artifact freshness states recorded after cache lookup or regeneration. */
export const artifactFreshnessSchema = z.enum(['fresh', 'reused', 'skipped']);

/** Per-package collection status across prep artifact families. */
export const collectionStatusSchema = z.enum([
  'collected',
  'degraded',
  'skipped',
]);

/** Required vs optional tool classification for external preflight checks. */
export const toolRequirementSchema = z.enum(['required', 'optional']);

/** Dependency manifest fields scanned during workspace inspection. */
export const dependencyFieldSchema = z.enum([
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'resolutions',
  'overrides',
]);

/** Signal severities emitted into the prep signals artifact. */
export const signalSeveritySchema = z.enum(['info', 'warn', 'error']);

export type Mode = z.infer<typeof modeSchema>;
export type ModelTier = z.infer<typeof modelTierSchema>;
export type RecoveryAction = z.infer<typeof recoveryActionSchema>;
export type OutcomeClass = z.infer<typeof outcomeClassSchema>;
export type PrimaryAction = z.infer<typeof primaryActionSchema>;

/**
 * @fileoverview Zod enums for typed string literals in manifests, artifacts, and policy.
 */

import { z } from 'zod';

export const modeSchema = z.enum(['triage', 'research', 'implementation']);

export const modelTierSchema = z.enum(['nano', 'mini', 'full']);

export const recoveryActionSchema = z.enum([
  'refresh_docs',
  'refresh_releases',
  'retry_one_failed_artifact_family',
  're_run_with_escalation',
]);

export const frameworkEnrichmentSchema = z.enum([
  'react',
  'next',
  'expo',
  'convex',
]);

export const outcomeClassSchema = z.enum([
  'ready_to_implement',
  'review_required',
  'blocked',
  'degraded_reference_only',
]);

export const primaryActionSchema = z.enum([
  'implement_now',
  'review_key_claims',
  'refresh_missing_evidence',
  're_run_with_escalation',
  'stop_blocked',
]);

export const artifactFamilySchema = z.enum([
  'meta',
  'docs',
  'releases',
  'source_paths',
  'diff',
  'usage',
  'signals',
]);

export const sourceFamilySchema = z.enum([
  'bun',
  'opensrc',
  'ctx7',
  'gh',
  'filesystem',
  'git',
]);

export const artifactFreshnessSchema = z.enum(['fresh', 'reused', 'skipped']);

export const collectionStatusSchema = z.enum([
  'collected',
  'degraded',
  'skipped',
]);

export const toolRequirementSchema = z.enum(['required', 'optional']);

export const dependencyFieldSchema = z.enum([
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'resolutions',
  'overrides',
]);

export const signalSeveritySchema = z.enum(['info', 'warn', 'error']);

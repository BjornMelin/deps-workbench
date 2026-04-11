/* Zod schemas and inferred types for analysis outputs and result bundles. */

import { z } from 'zod';
import {
  isoTimestampSchema,
  nonEmptyStringSchema,
  pathSchema,
  stringListSchema,
} from './common';
import {
  artifactFamilySchema,
  changeIntentSchema,
  claimBucketSchema,
  modelTierSchema,
  modeSchema,
  outcomeClassSchema,
  primaryActionSchema,
  recoveryActionSchema,
  recoveryStatusSchema,
  sourceFamilySchema,
} from './enums';

/** Normalized confidence score between 0 and 1. */
export const confidenceSchema = z.number().min(0).max(1);
/** Semantic outcome classification used in result payloads. */
export const semanticOutcomeSchema = outcomeClassSchema;
/** Routing factor categories used to compute the weighted escalation score. */
export const routingCategorySchema = z.enum([
  'upgradeSeverity',
  'evidenceConflict',
  'repoBlastRadius',
  'apiSurfaceMovement',
  'replacementOpportunity',
  'uncertainty',
  'coupling',
]);
/** Evidence locator attached to claims, checklist items, and open questions. */
export const evidenceReferenceSchema = z
  .object({
    artifactFamily: artifactFamilySchema,
    package: nonEmptyStringSchema.optional(),
    locator: nonEmptyStringSchema.optional(),
    excerpt: z.string().max(500).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.package === undefined && value.locator === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'evidence references must include package or locator',
      });
    }
  });
/** Single claim emitted in the machine-readable analysis result. */
export const resultClaimSchema = z
  .object({
    id: nonEmptyStringSchema,
    package: nonEmptyStringSchema.optional(),
    statement: nonEmptyStringSchema,
    confidence: confidenceSchema,
    bucket: claimBucketSchema,
    rationale: z.string().optional(),
    evidenceRefs: z.array(evidenceReferenceSchema).min(1),
  })
  .strict();
/** Implementation task item derived from the synthesis output. */
export const implementationChecklistItemSchema = z
  .object({
    id: nonEmptyStringSchema,
    package: nonEmptyStringSchema.optional(),
    targetFile: pathSchema,
    whyAffected: nonEmptyStringSchema,
    currentPattern: z.string().optional(),
    targetPattern: z.string().optional(),
    changeIntent: changeIntentSchema,
    confidence: confidenceSchema,
    evidenceRefs: z.array(evidenceReferenceSchema).min(1),
    validationSteps: stringListSchema.default([]),
  })
  .strict();
/** Validation task item derived from the synthesis output. */
export const validationChecklistItemSchema = z
  .object({
    id: nonEmptyStringSchema,
    package: nonEmptyStringSchema.optional(),
    description: nonEmptyStringSchema,
    command: z.string().optional(),
    rationale: z.string().optional(),
    required: z.boolean().default(true),
    evidenceRefs: z.array(evidenceReferenceSchema).default([]),
  })
  .strict();
/** One unresolved question that still needs operator judgment. */
export const openQuestionSchema = z
  .object({
    id: nonEmptyStringSchema,
    package: nonEmptyStringSchema.optional(),
    question: nonEmptyStringSchema,
    whyOpen: nonEmptyStringSchema,
  })
  .strict();
/** High-level narrative and semantic summary for a result report. */
export const decisionReportSchema = z
  .object({
    schemaVersion: z.literal('1'),
    generatedAt: isoTimestampSchema,
    semanticOutcome: semanticOutcomeSchema,
    summary: nonEmptyStringSchema,
    topRiskSignals: stringListSchema.default([]),
    claims: z.array(resultClaimSchema).min(1),
    recommendedNextMode: modeSchema.optional(),
    promotionReason: nonEmptyStringSchema.optional(),
    promotionConfidence: confidenceSchema.optional(),
  })
  .strict();
/** Claim-to-evidence mapping written alongside the analysis result. */
export const evidenceMapSchema = z
  .object({
    schemaVersion: z.literal('1'),
    generatedAt: isoTimestampSchema,
    claims: z
      .array(
        z
          .object({
            claimId: nonEmptyStringSchema,
            evidenceRefs: z.array(evidenceReferenceSchema).min(1),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
/** Container schema for the implementation checklist array. */
export const implementationChecklistSchema = z
  .object({
    schemaVersion: z.literal('1'),
    generatedAt: isoTimestampSchema,
    items: z.array(implementationChecklistItemSchema),
  })
  .strict();
/** Container schema for the validation checklist array. */
export const validationChecklistSchema = z
  .object({
    schemaVersion: z.literal('1'),
    generatedAt: isoTimestampSchema,
    items: z.array(validationChecklistItemSchema).min(1),
  })
  .strict();
/** Container schema for unresolved open questions. */
export const openQuestionsSchema = z
  .object({
    schemaVersion: z.literal('1'),
    generatedAt: isoTimestampSchema,
    questions: z.array(openQuestionSchema),
  })
  .strict();
/** Model synthesis payload returned by the analysis executor. */
export const analysisSynthesisSchema = z
  .object({
    executiveBrief: nonEmptyStringSchema,
    semanticOutcome: semanticOutcomeSchema,
    summary: nonEmptyStringSchema,
    topRiskSignals: stringListSchema.default([]),
    claims: z.array(resultClaimSchema).min(1),
    implementationChecklist: z.array(implementationChecklistItemSchema),
    validationChecklist: z.array(validationChecklistItemSchema).min(1),
    openQuestions: z.array(openQuestionSchema).default([]),
    recommendedNextMode: modeSchema.optional(),
    promotionReason: nonEmptyStringSchema.optional(),
    promotionConfidence: confidenceSchema.optional(),
  })
  .strict();
/** Weighted routing factor entry produced by routing heuristics. */
export const routingScoreFactorSchema = z
  .object({
    category: routingCategorySchema,
    rawScore: z.number().min(0).max(100),
    weightedContribution: z.number().min(0).max(100),
    rationale: nonEmptyStringSchema,
  })
  .strict();
/** Final routing decision including tier, model, thresholds, and factors. */
export const routingDecisionSchema = z
  .object({
    selectedTier: modelTierSchema,
    selectedModel: nonEmptyStringSchema,
    escalationScore: z.number().min(0).max(100),
    thresholds: z
      .object({
        triageNanoMax: z.number().min(0).max(100),
        fullEscalationMin: z.number().min(0).max(100),
        recoveryEscalationMin: z.number().min(0).max(100),
      })
      .strict(),
    factors: z.array(routingScoreFactorSchema).min(1),
  })
  .strict();
/** Single bounded recovery record written after escalation attempts. */
export const recoveryRecordSchema = z
  .object({
    action: recoveryActionSchema,
    status: recoveryStatusSchema,
    trigger: nonEmptyStringSchema,
    fromTier: modelTierSchema,
    toTier: modelTierSchema.optional(),
    notes: stringListSchema.default([]),
  })
  .strict();
/** Paths to the individual result artifact files for one run. */
export const resultFilesSchema = z
  .object({
    executiveBrief: pathSchema,
    decisionReport: pathSchema,
    evidenceMap: pathSchema,
    implementationChecklist: pathSchema,
    validationChecklist: pathSchema,
    openQuestions: pathSchema.optional(),
  })
  .strict();
/** Lightweight manifest item used to surface an unverified result claim. */
export const resultUnverifiedItemSchema = z
  .object({
    id: nonEmptyStringSchema,
    confidence: confidenceSchema,
    bucket: z.literal('UNVERIFIED'),
  })
  .strict();
/** Top-level result manifest written after synthesis and recovery complete. */
export const resultManifestSchema = z
  .object({
    schemaVersion: z.literal('1'),
    runId: nonEmptyStringSchema,
    mode: modeSchema,
    prepManifestPath: pathSchema,
    resultRoot: pathSchema,
    createdAt: isoTimestampSchema,
    outcomeClass: outcomeClassSchema,
    primaryAction: primaryActionSchema,
    modelUsed: nonEmptyStringSchema.optional(),
    routingDecision: routingDecisionSchema,
    recovery: z.array(recoveryRecordSchema).default([]),
    topRiskSignals: stringListSchema.default([]),
    topUnverifiedItems: z.array(resultUnverifiedItemSchema).default([]),
    recommendedNextMode: modeSchema.optional(),
    promotionReason: nonEmptyStringSchema.optional(),
    promotionConfidence: confidenceSchema.optional(),
    recommendedReadOrder: stringListSchema.default([]),
    stopConditions: stringListSchema.default([]),
    sourceFamilies: z.array(sourceFamilySchema).default([]),
    resultFiles: resultFilesSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.outcomeClass === 'blocked' &&
      value.primaryAction !== 'stop_blocked'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['primaryAction'],
        message:
          'primaryAction must be stop_blocked when outcomeClass is blocked',
      });
    }

    if (
      value.primaryAction === 'stop_blocked' &&
      value.outcomeClass !== 'blocked'
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['outcomeClass'],
        message:
          'outcomeClass must be blocked when primaryAction is stop_blocked',
      });
    }
  });

/** Inferred type for evidence references used by result claims and checklists. */
export type EvidenceReference = z.infer<typeof evidenceReferenceSchema>;
/** Inferred type for a single result claim. */
export type ResultClaim = z.infer<typeof resultClaimSchema>;
/** Inferred type for an implementation checklist item. */
export type ImplementationChecklistItem = z.infer<
  typeof implementationChecklistItemSchema
>;
/** Inferred type for a validation checklist item. */
export type ValidationChecklistItem = z.infer<
  typeof validationChecklistItemSchema
>;
/** Inferred type for an unresolved open question. */
export type OpenQuestion = z.infer<typeof openQuestionSchema>;
/** Inferred type for the decision report payload. */
export type DecisionReport = z.infer<typeof decisionReportSchema>;
/** Inferred type for the evidence map payload. */
export type EvidenceMap = z.infer<typeof evidenceMapSchema>;
/** Inferred type for the implementation checklist container. */
export type ImplementationChecklist = z.infer<
  typeof implementationChecklistSchema
>;
/** Inferred type for the validation checklist container. */
export type ValidationChecklist = z.infer<typeof validationChecklistSchema>;
/** Inferred type for the open questions container. */
export type OpenQuestions = z.infer<typeof openQuestionsSchema>;
/** Inferred type for the model synthesis payload. */
export type AnalysisSynthesis = z.infer<typeof analysisSynthesisSchema>;
/** Inferred type for the routing decision payload. */
export type RoutingDecision = z.infer<typeof routingDecisionSchema>;
/** Inferred type for the recovery record payload. */
export type RecoveryRecord = z.infer<typeof recoveryRecordSchema>;
/** Inferred type for the full result manifest payload. */
export type ResultManifest = z.infer<typeof resultManifestSchema>;

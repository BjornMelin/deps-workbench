/**
 * @fileoverview Zod schemas and inferred types for analysis outputs and result bundles.
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

export const confidenceSchema = z.number().min(0).max(1);

export const evidenceReferenceSchema = z
  .object({
    artifactFamily: artifactFamilySchema,
    package: nonEmptyStringSchema.optional(),
    locator: nonEmptyStringSchema.optional(),
    excerpt: z.string().max(500).optional(),
  })
  .strict();

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

export const openQuestionSchema = z
  .object({
    id: nonEmptyStringSchema,
    package: nonEmptyStringSchema.optional(),
    question: nonEmptyStringSchema,
    whyOpen: nonEmptyStringSchema,
  })
  .strict();

export const decisionReportSchema = z
  .object({
    schemaVersion: z.literal('1'),
    generatedAt: isoTimestampSchema,
    semanticOutcome: z.enum([
      'ready_to_implement',
      'review_required',
      'blocked',
      'degraded_reference_only',
    ]),
    summary: nonEmptyStringSchema,
    topRiskSignals: stringListSchema.default([]),
    claims: z.array(resultClaimSchema).min(1),
    recommendedNextMode: modeSchema.optional(),
    promotionReason: nonEmptyStringSchema.optional(),
    promotionConfidence: confidenceSchema.optional(),
  })
  .strict();

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

export const implementationChecklistSchema = z
  .object({
    schemaVersion: z.literal('1'),
    generatedAt: isoTimestampSchema,
    items: z.array(implementationChecklistItemSchema),
  })
  .strict();

export const validationChecklistSchema = z
  .object({
    schemaVersion: z.literal('1'),
    generatedAt: isoTimestampSchema,
    items: z.array(validationChecklistItemSchema).min(1),
  })
  .strict();

export const openQuestionsSchema = z
  .object({
    schemaVersion: z.literal('1'),
    generatedAt: isoTimestampSchema,
    questions: z.array(openQuestionSchema),
  })
  .strict();

export const analysisSynthesisSchema = z
  .object({
    executiveBrief: nonEmptyStringSchema,
    semanticOutcome: z.enum([
      'ready_to_implement',
      'review_required',
      'blocked',
      'degraded_reference_only',
    ]),
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

export const routingScoreFactorSchema = z
  .object({
    category: z.enum([
      'upgradeSeverity',
      'evidenceConflict',
      'repoBlastRadius',
      'apiSurfaceMovement',
      'replacementOpportunity',
      'uncertainty',
      'coupling',
    ]),
    rawScore: z.number().min(0).max(100),
    weightedContribution: z.number().min(0).max(100),
    rationale: nonEmptyStringSchema,
  })
  .strict();

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

export const resultUnverifiedItemSchema = z
  .object({
    id: nonEmptyStringSchema,
    confidence: confidenceSchema,
    bucket: z.literal('UNVERIFIED'),
  })
  .strict();

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
    modelUsed: nonEmptyStringSchema,
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

export type EvidenceReference = z.infer<typeof evidenceReferenceSchema>;
export type ResultClaim = z.infer<typeof resultClaimSchema>;
export type ImplementationChecklistItem = z.infer<
  typeof implementationChecklistItemSchema
>;
export type ValidationChecklistItem = z.infer<
  typeof validationChecklistItemSchema
>;
export type OpenQuestion = z.infer<typeof openQuestionSchema>;
export type DecisionReport = z.infer<typeof decisionReportSchema>;
export type EvidenceMap = z.infer<typeof evidenceMapSchema>;
export type ImplementationChecklist = z.infer<
  typeof implementationChecklistSchema
>;
export type ValidationChecklist = z.infer<typeof validationChecklistSchema>;
export type OpenQuestions = z.infer<typeof openQuestionsSchema>;
export type AnalysisSynthesis = z.infer<typeof analysisSynthesisSchema>;
export type RoutingDecision = z.infer<typeof routingDecisionSchema>;
export type RecoveryRecord = z.infer<typeof recoveryRecordSchema>;
export type ResultManifest = z.infer<typeof resultManifestSchema>;

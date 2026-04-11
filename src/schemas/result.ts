import { z } from 'zod';
import {
  isoTimestampSchema,
  nonEmptyStringSchema,
  pathSchema,
  stringListSchema,
} from './common';
import { modeSchema, outcomeClassSchema, primaryActionSchema } from './enums';

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
    confidence: z.number().min(0).max(1),
    bucket: z.literal('UNVERIFIED'),
  })
  .strict();

export const resultManifestSchema = z
  .object({
    schemaVersion: z.literal('1'),
    runId: nonEmptyStringSchema,
    mode: modeSchema,
    resultRoot: pathSchema,
    createdAt: isoTimestampSchema,
    outcomeClass: outcomeClassSchema,
    primaryAction: primaryActionSchema,
    modelUsed: nonEmptyStringSchema,
    topRiskSignals: stringListSchema.default([]),
    topUnverifiedItems: z.array(resultUnverifiedItemSchema).default([]),
    recommendedNextMode: modeSchema.optional(),
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

export type ResultManifest = z.infer<typeof resultManifestSchema>;

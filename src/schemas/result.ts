import { z } from 'zod';

import {
  modeSchema,
  outcomeClassSchema,
  primaryActionSchema,
} from './enums';
import {
  isoTimestampSchema,
  nonEmptyStringSchema,
  pathSchema,
  stringListSchema,
} from './common';

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
    topUnverifiedItems: stringListSchema.default([]),
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
        message: 'primaryAction must be stop_blocked when outcomeClass is blocked',
      });
    }
  });

export type ResultManifest = z.infer<typeof resultManifestSchema>;

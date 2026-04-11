import { z } from 'zod';

import {
  frameworkEnrichmentSchema,
  modelTierSchema,
  modeSchema,
  recoveryActionSchema,
} from './enums';

const scoringWeightSchema = z.number().min(0).max(100);

const scoringWeightsSchema = z
  .object({
    upgradeSeverity: scoringWeightSchema,
    evidenceConflict: scoringWeightSchema,
    repoBlastRadius: scoringWeightSchema,
    apiSurfaceMovement: scoringWeightSchema,
    replacementOpportunity: scoringWeightSchema,
    uncertainty: scoringWeightSchema,
    coupling: scoringWeightSchema,
  })
  .strict();

export const policySchema = z
  .object({
    modes: z
      .object({
        default: modeSchema,
        allowed: z.array(modeSchema).min(1),
      })
      .strict()
      .refine(
        ({ allowed, default: defaultMode }) => allowed.includes(defaultMode),
        {
          message: 'modes.default must be included in modes.allowed',
          path: ['default'],
        },
      ),
    modelRouting: z
      .object({
        tiers: z.record(modelTierSchema, z.string().trim().min(1)),
        thresholds: z
          .object({
            triageNanoMax: z.number().min(0).max(100),
            fullEscalationMin: z.number().min(0).max(100),
            recoveryEscalationMin: z.number().min(0).max(100),
          })
          .strict(),
        weights: scoringWeightsSchema,
      })
      .strict()
      .superRefine((value, ctx) => {
        if (
          value.thresholds.triageNanoMax >=
          value.thresholds.recoveryEscalationMin
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['thresholds', 'triageNanoMax'],
            message:
              'modelRouting.thresholds.triageNanoMax must be less than modelRouting.thresholds.recoveryEscalationMin',
          });
        }

        if (
          value.thresholds.recoveryEscalationMin >=
          value.thresholds.fullEscalationMin
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['thresholds', 'recoveryEscalationMin'],
            message:
              'modelRouting.thresholds.recoveryEscalationMin must be less than modelRouting.thresholds.fullEscalationMin',
          });
        }

        const totalWeight = Object.values(value.weights).reduce(
          (sum, weight) => sum + weight,
          0,
        );

        if (Math.abs(totalWeight - 100) > 1e-6) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['weights'],
            message: 'modelRouting.weights must sum to 100',
          });
        }
      }),
    recovery: z
      .object({
        maxAutomaticHops: z.number().int().min(0).max(1),
        allowedActions: z.array(recoveryActionSchema).min(1),
      })
      .strict(),
    frameworkEnrichments: z.array(frameworkEnrichmentSchema),
  })
  .strict();

export type Policy = z.infer<typeof policySchema>;

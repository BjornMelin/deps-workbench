import { z } from 'zod';

import {
  frameworkEnrichmentSchema,
  modelTierSchema,
  modeSchema,
  recoveryActionSchema,
} from './enums';

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
      })
      .strict(),
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

import { z } from 'zod';

import {
  frameworkEnrichmentSchema,
  modeSchema,
  modelTierSchema,
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
        tiers: z
          .object({
            nano: z.string().trim().min(1),
            mini: z.string().trim().min(1),
            full: z.string().trim().min(1),
          })
          .strict(),
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

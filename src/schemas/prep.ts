import { z } from 'zod';
import {
  isoTimestampSchema,
  nonEmptyStringSchema,
  pathSchema,
  stringListSchema,
} from './common';
import { artifactFamilySchema, modeSchema } from './enums';

export const cacheKeySchema = z
  .object({
    family: artifactFamilySchema,
    key: nonEmptyStringSchema,
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
    artifactFamilies: z.array(artifactFamilySchema).min(1),
    degradedArtifactFamilies: z.array(artifactFamilySchema).default([]),
    sourceFamilies: stringListSchema.min(1),
    cacheKeys: z.array(cacheKeySchema).default([]),
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

export type PrepManifest = z.infer<typeof prepManifestSchema>;

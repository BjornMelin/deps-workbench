import { z } from 'zod';

import {
  artifactFamilySchema,
  modeSchema,
} from './enums';
import {
  isoTimestampSchema,
  nonEmptyStringSchema,
  pathSchema,
  stringListSchema,
} from './common';

export const cacheKeySchema = z
  .object({
    family: nonEmptyStringSchema,
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
  .strict();

export type PrepManifest = z.infer<typeof prepManifestSchema>;

/** Shared Zod building blocks for manifests and policy (strings, paths, lists). */

import { z } from 'zod';

/** Non-empty string after trim (identifiers, single-line text fields). */
export const nonEmptyStringSchema = z.string().trim().min(1);

/** ISO 8601 datetime with offset, for `generatedAt`-style fields. */
export const isoTimestampSchema = z.string().datetime({ offset: true });

/** Filesystem path or path-like string; same constraints as `nonEmptyStringSchema`. */
export const pathSchema = nonEmptyStringSchema;

/** Array of non-empty strings preserving insertion order. */
export const stringListSchema = z.array(nonEmptyStringSchema);

/** Array of non-empty strings deduplicated to insertion order. */
export const stringSetAsListSchema = stringListSchema.transform((values) =>
  Array.from(new Set(values)),
);

/** String-to-string record used for config-like maps and metadata bags. */
export const stringMapSchema = z.record(
  nonEmptyStringSchema,
  nonEmptyStringSchema,
);

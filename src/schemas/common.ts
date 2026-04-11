import { z } from 'zod';

export const nonEmptyStringSchema = z.string().trim().min(1);

export const isoTimestampSchema = z.string().datetime({ offset: true });

export const pathSchema = nonEmptyStringSchema;

export const stringListSchema = z.array(nonEmptyStringSchema);

export const stringSetAsListSchema = stringListSchema.transform((values) =>
  Array.from(new Set(values)),
);

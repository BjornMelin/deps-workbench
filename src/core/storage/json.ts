import { readFile, writeFile } from 'node:fs/promises';

import { parse as parseJsonc } from 'jsonc-parser';
import type { ZodType } from 'zod';

export async function readJsonFile<T>(
  filePath: string,
  schema: ZodType<T>,
): Promise<T> {
  const contents = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(contents) as unknown;

  return schema.parse(parsed);
}

export async function readJsoncFile<T>(
  filePath: string,
  schema: ZodType<T>,
): Promise<T> {
  const contents = await readFile(filePath, 'utf8');
  const parsed = parseJsonc(contents) as unknown;

  return schema.parse(parsed);
}

export async function writeJsonFile(
  filePath: string,
  value: unknown,
): Promise<void> {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;

  await writeFile(filePath, serialized, 'utf8');
}

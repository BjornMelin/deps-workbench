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
  const parseErrors: Array<{
    error: number;
    offset: number;
    length: number;
  }> = [];
  const parsed = parseJsonc(contents, parseErrors) as unknown;

  if (parseErrors.length > 0) {
    const diagnostics = parseErrors
      .map(
        ({ error, offset, length }) =>
          `error ${error} at offset ${offset} (length ${length})`,
      )
      .join('; ');

    throw new SyntaxError(
      `Invalid JSONC syntax in ${filePath}: ${diagnostics}`,
    );
  }

  return schema.parse(parsed);
}

export async function writeJsonFile(
  filePath: string,
  value: unknown,
): Promise<void> {
  const serialized = JSON.stringify(value, null, 2);

  if (serialized === undefined) {
    throw new TypeError(`Value is not JSON-serializable for ${filePath}`);
  }

  await writeFile(filePath, `${serialized}\n`, 'utf8');
}

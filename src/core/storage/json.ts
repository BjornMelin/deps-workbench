import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { parse as parseJsonc } from 'jsonc-parser';
import type { ZodType } from 'zod';

/**
 * Reads a UTF-8 JSON file and validates with the given Zod schema.
 *
 * @throws If the file is not valid JSON or validation fails.
 */
export async function readJsonFile<T>(
  filePath: string,
  schema: ZodType<T>,
): Promise<T> {
  const contents = await Bun.file(filePath).text();
  const parsed = JSON.parse(contents) as unknown;

  return schema.parse(parsed);
}

/**
 * Reads JSON with comments (JSONC), rejects on parse diagnostics, then validates with Zod.
 *
 * @throws `SyntaxError` when JSONC parsing fails; Zod errors when validation fails.
 */
export async function readJsoncFile<T>(
  filePath: string,
  schema: ZodType<T>,
): Promise<T> {
  const contents = await Bun.file(filePath).text();
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

/**
 * Writes pretty-printed JSON (two-space indent, trailing newline). Creates parent directories.
 *
 * @throws `TypeError` when `value` is not JSON-serializable.
 */
export async function writeJsonFile(
  filePath: string,
  value: unknown,
): Promise<void> {
  const serialized = JSON.stringify(value, null, 2);

  if (serialized === undefined) {
    throw new TypeError(`Value is not JSON-serializable for ${filePath}`);
  }

  await mkdir(path.dirname(filePath), { recursive: true });
  await Bun.write(filePath, `${serialized}\n`);
}

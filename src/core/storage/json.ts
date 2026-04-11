import { mkdir, rename } from 'node:fs/promises';
import path from 'node:path';

import { parse as parseJsonc } from 'jsonc-parser';
import type { ZodType } from 'zod';

/**
 * Reads a UTF-8 JSON file and validates with the given Zod schema.
 *
 * @param filePath - Absolute or repo-relative path to the JSON file.
 * @param schema - Zod schema used to validate the parsed value.
 * @returns Parsed JSON value after schema validation.
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
 * @param filePath - Absolute or repo-relative path to the JSONC file.
 * @param schema - Zod schema used to validate the parsed value.
 * @returns Parsed JSONC value after syntax and schema validation.
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
 * @param filePath - Output path for the JSON file.
 * @param value - Serializable value to persist.
 * @returns Resolves when the file and parent directories have been written.
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

/**
 * Writes JSON through a temporary sibling file, then renames it into place.
 *
 * @param filePath - Output path for the JSON file.
 * @param value - Serializable value to persist.
 * @returns Resolves when the final file contents are atomically visible at `filePath`.
 * @throws `TypeError` when `value` is not JSON-serializable.
 */
export async function writeJsonFileAtomic(
  filePath: string,
  value: unknown,
): Promise<void> {
  const tempFilePath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  await writeJsonFile(tempFilePath, value);
  await rename(tempFilePath, filePath);
}

import { createHash } from 'node:crypto';
import path from 'node:path';

import type { ZodType } from 'zod';

import { readJsonFile, writeJsonFile } from '../storage/json';
import { resolveCacheDirectory } from '../storage/paths';

/**
 * Artifact value with stable cache key and whether it was read from disk or freshly produced.
 *
 * @typeParam T - Artifact payload type stored in or read from cache.
 */
export type CachedArtifactResult<T> = {
  value: T;
  cacheKey: string;
  freshness: 'fresh' | 'reused';
};

function createCacheHash(input: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex')
    .slice(0, 16);
}

/**
 * Returns a cached artifact JSON when the hash of `cacheInput` matches an existing file; otherwise runs `producer` and persists.
 *
 * @typeParam T - Must match `schema` (typically an artifact family type).
 * @param input - Cache metadata, validation schema, and producer for one artifact family.
 * @returns Cached or freshly produced artifact value with stable key and freshness state.
 */
export async function withArtifactCache<T>(input: {
  repoRoot: string;
  family: string;
  cacheInput: unknown;
  schema: ZodType<T>;
  producer: () => Promise<T>;
}): Promise<CachedArtifactResult<T>> {
  const cacheKey = `${input.family}_${createCacheHash(input.cacheInput)}`;
  const cacheDirectory = resolveCacheDirectory(
    input.repoRoot,
    input.family,
    cacheKey,
  );
  const cacheFilePath = path.join(cacheDirectory, 'artifact.json');

  if (await Bun.file(cacheFilePath).exists()) {
    try {
      return {
        value: await readJsonFile(cacheFilePath, input.schema),
        cacheKey,
        freshness: 'reused',
      };
    } catch {
      // Regenerate invalid cache entries instead of turning a cache miss into a hard failure.
    }
  }

  const value = await input.producer();
  input.schema.parse(value);
  await writeJsonFile(cacheFilePath, value);

  return {
    value,
    cacheKey,
    freshness: 'fresh',
  };
}

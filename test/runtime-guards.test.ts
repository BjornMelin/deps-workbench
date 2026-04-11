import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { runCommand } from '../src/core/exec/run-command';
import { withArtifactCache } from '../src/core/prep/cache';
import { scanRepoForRequestedPackages } from '../src/core/prep/workspace';
import { readJsonFile } from '../src/core/storage/json';
import { resolveCacheDirectory } from '../src/core/storage/paths';

const fixtureRepoRoot = path.join(
  import.meta.dir,
  '..',
  'fixtures',
  'prep',
  'repo-basic',
);

describe('runCommand', () => {
  test('returns after killing a timed out subprocess', async () => {
    const result = await runCommand(
      ['bun', '-e', 'setInterval(() => {}, 1000)'],
      { timeoutMs: 50 },
    );

    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBeNull();
  });
});

describe('withArtifactCache', () => {
  test('regenerates invalid cache entries instead of failing the run', async () => {
    const repoRoot = await mkdtemp(
      path.join(os.tmpdir(), 'deps-workbench-cache-'),
    );
    const cacheInput = { package: 'zod' };

    try {
      const initialResult = await withArtifactCache({
        repoRoot,
        family: 'docs',
        cacheInput,
        schema: z.object({ ok: z.literal(true) }),
        producer: async () => ({ ok: true }) as const,
      });
      const cacheDirectory = resolveCacheDirectory(
        repoRoot,
        'docs',
        initialResult.cacheKey,
      );
      const cacheFilePath = path.join(cacheDirectory, 'artifact.json');
      await Bun.write(cacheFilePath, '{not-valid-json');

      let producerCalls = 0;
      const result = await withArtifactCache({
        repoRoot,
        family: 'docs',
        cacheInput,
        schema: z.object({ ok: z.literal(true) }),
        producer: async () => {
          producerCalls += 1;
          return { ok: true } as const;
        },
      });

      expect(result.freshness).toBe('fresh');
      expect(result.value).toEqual({ ok: true });
      expect(producerCalls).toBe(1);
      expect(
        await readJsonFile(cacheFilePath, z.object({ ok: z.literal(true) })),
      ).toEqual({ ok: true });
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });
});

describe('scanRepoForRequestedPackages', () => {
  test('matches dependencies when requested package specs include versions', async () => {
    const result = await scanRepoForRequestedPackages(fixtureRepoRoot, [
      'zod@4.3.6',
    ]);

    expect(result.packages).toHaveLength(1);
    expect(result.packages[0]?.package).toBe('zod');
    expect(result.packages[0]?.occurrences.length).toBeGreaterThan(0);
  });
});

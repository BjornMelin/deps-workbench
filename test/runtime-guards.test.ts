import { describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { bunAuditCollected } from '../src/core/collectors/bun';
import { runCommand } from '../src/core/exec/run-command';
import { withArtifactCache } from '../src/core/prep/cache';
import { scanRepoForRequestedPackages } from '../src/core/prep/workspace';
import { readJsonFile } from '../src/core/storage/json';
import { resolveCacheDirectory } from '../src/core/storage/paths';
import { prepRepoSummarySchema } from '../src/schemas';

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

describe('collectUsageArtifact', () => {
  test('treats bun audit exit code 1 with JSON output as collected audit data', () => {
    expect(
      bunAuditCollected({
        command: ['bun', 'audit', '--json'],
        cwd: '/repo',
        stdout: '{"vulnerabilities":[{"package":"lodash"}]}',
        stderr: '',
        exitCode: 1,
        timedOut: false,
      }),
    ).toBe(true);
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

  test('serializes concurrent cache misses for the same key', async () => {
    const repoRoot = await mkdtemp(
      path.join(os.tmpdir(), 'deps-workbench-cache-lock-'),
    );
    let producerCalls = 0;
    let releaseProducer!: () => void;
    const producerStarted = new Promise<void>((resolve) => {
      releaseProducer = resolve;
    });

    try {
      const sharedInput = {
        repoRoot,
        family: 'docs',
        cacheInput: { package: 'zod' },
        schema: z.object({ ok: z.literal(true) }),
        producer: async () => {
          producerCalls += 1;
          await producerStarted;
          return { ok: true } as const;
        },
      };

      const first = withArtifactCache(sharedInput);
      const second = withArtifactCache(sharedInput);
      await Bun.sleep(10);
      releaseProducer();

      const [firstResult, secondResult] = await Promise.all([first, second]);

      expect(producerCalls).toBe(1);
      expect(firstResult.value).toEqual({ ok: true });
      expect(secondResult.value).toEqual({ ok: true });
      expect([firstResult.freshness, secondResult.freshness].sort()).toEqual([
        'fresh',
        'reused',
      ]);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });
});

describe('scanRepoForRequestedPackages', () => {
  test('prep repo summary schema allows repositories without workspaces', () => {
    expect(() =>
      prepRepoSummarySchema.parse({
        root: '/repo',
        hasWorkspaces: false,
        workspaceCount: 0,
        packageJsonCount: 1,
        lockfilePresent: true,
      }),
    ).not.toThrow();
  });

  test('matches dependencies when requested package specs include versions', async () => {
    const result = await scanRepoForRequestedPackages(fixtureRepoRoot, [
      'zod@4.3.6',
    ]);

    expect(result.packages).toHaveLength(1);
    expect(result.packages[0]?.package).toBe('zod');
    expect(result.packages[0]?.occurrences.length).toBeGreaterThan(0);
  });

  test('does not count the root manifest as a workspace', async () => {
    const repoRoot = await mkdtemp(
      path.join(os.tmpdir(), 'deps-workbench-single-package-'),
    );

    try {
      await Bun.write(
        path.join(repoRoot, 'package.json'),
        JSON.stringify(
          {
            name: 'single-package-repo',
            packageManager: 'bun@1.3.12',
            dependencies: {
              zod: '^4.3.6',
            },
          },
          null,
          2,
        ),
      );

      const result = await scanRepoForRequestedPackages(repoRoot, ['zod']);

      expect(result.repo.hasWorkspaces).toBe(false);
      expect(result.repo.workspaceCount).toBe(0);
      expect(result.repo.packageJsonCount).toBe(1);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  test('ignores non-string override entries when scanning dependencies', async () => {
    const repoRoot = await mkdtemp(
      path.join(os.tmpdir(), 'deps-workbench-workspace-'),
    );

    try {
      await Bun.write(
        path.join(repoRoot, 'package.json'),
        JSON.stringify(
          {
            name: 'workspace-root',
            packageManager: 'bun@1.3.12',
            overrides: {
              react: {
                scheduler: '1.0.0',
              },
            },
          },
          null,
          2,
        ),
      );

      const result = await scanRepoForRequestedPackages(repoRoot, ['react']);

      expect(result.packages).toHaveLength(1);
      expect(result.packages[0]?.occurrences).toEqual([]);
      expect(result.packages[0]?.declaredVersions).toEqual([]);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  test('respects negated workspace globs during manifest discovery', async () => {
    const repoRoot = await mkdtemp(
      path.join(os.tmpdir(), 'deps-workbench-negated-workspace-'),
    );
    const includedWorkspaceDir = path.join(repoRoot, 'packages', 'included');
    const excludedWorkspaceDir = path.join(repoRoot, 'packages', 'excluded');

    try {
      await Bun.write(
        path.join(repoRoot, 'package.json'),
        JSON.stringify(
          {
            name: 'workspace-root',
            packageManager: 'bun@1.3.12',
            workspaces: ['packages/*', '!packages/excluded'],
          },
          null,
          2,
        ),
      );
      await Bun.write(
        path.join(includedWorkspaceDir, 'package.json'),
        JSON.stringify({
          name: 'included-workspace',
          dependencies: {
            zod: '^4.3.6',
          },
        }),
      );
      await Bun.write(
        path.join(excludedWorkspaceDir, 'package.json'),
        JSON.stringify({
          name: 'excluded-workspace',
          dependencies: {
            zod: '^9.9.9',
          },
        }),
      );

      const result = await scanRepoForRequestedPackages(repoRoot, ['zod']);

      expect(result.repo.workspaceCount).toBe(1);
      expect(result.repo.packageJsonCount).toBe(2);
      expect(result.packages[0]?.declaredVersions).toEqual(['^4.3.6']);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  test('ignores non-string workspace entries during manifest discovery', async () => {
    const repoRoot = await mkdtemp(
      path.join(os.tmpdir(), 'deps-workbench-nonstring-workspace-'),
    );
    const includedWorkspaceDir = path.join(repoRoot, 'packages', 'included');

    try {
      await Bun.write(
        path.join(repoRoot, 'package.json'),
        JSON.stringify(
          {
            name: 'workspace-root',
            packageManager: 'bun@1.3.12',
            workspaces: ['packages/*', 42, null, { nope: true }],
          },
          null,
          2,
        ),
      );
      await Bun.write(
        path.join(includedWorkspaceDir, 'package.json'),
        JSON.stringify({
          name: 'included-workspace',
          dependencies: {
            zod: '^4.3.6',
          },
        }),
      );

      const result = await scanRepoForRequestedPackages(repoRoot, ['zod']);

      expect(result.repo.workspaceCount).toBe(1);
      expect(result.repo.packageJsonCount).toBe(2);
      expect(result.packages[0]?.declaredVersions).toEqual(['^4.3.6']);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  test('does not let negated workspace globs remove the root manifest', async () => {
    const repoRoot = await mkdtemp(
      path.join(os.tmpdir(), 'deps-workbench-root-workspace-'),
    );

    try {
      await Bun.write(
        path.join(repoRoot, 'package.json'),
        JSON.stringify(
          {
            name: 'workspace-root',
            packageManager: 'bun@1.3.12',
            workspaces: ['package.json', '!package.json'],
            dependencies: {
              zod: '^4.3.6',
            },
          },
          null,
          2,
        ),
      );

      const result = await scanRepoForRequestedPackages(repoRoot, ['zod']);

      expect(result.repo.packageJsonCount).toBe(1);
      expect(result.repo.workspaceCount).toBe(0);
      expect(result.packages[0]?.declaredVersions).toEqual(['^4.3.6']);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  test('normalizes relative repo roots before workspace negation checks', async () => {
    const tempParent = await mkdtemp(
      path.join(os.tmpdir(), 'deps-workbench-relative-root-'),
    );
    const repoRoot = path.join(tempParent, 'repo');
    const includedWorkspaceDir = path.join(repoRoot, 'packages', 'included');
    const previousCwd = process.cwd();

    try {
      await mkdir(repoRoot, { recursive: true });
      await mkdir(includedWorkspaceDir, { recursive: true });
      await Bun.write(
        path.join(repoRoot, 'package.json'),
        JSON.stringify(
          {
            name: 'relative-root-fixture',
            private: true,
            workspaces: ['packages/*', 'package.json', '!package.json'],
            dependencies: {
              zod: '^4.3.6',
            },
          },
          null,
          2,
        ),
      );
      await Bun.write(
        path.join(includedWorkspaceDir, 'package.json'),
        JSON.stringify(
          {
            name: 'included-workspace',
            dependencies: {
              zod: '^5.0.0',
            },
          },
          null,
          2,
        ),
      );
      await Bun.write(path.join(repoRoot, 'bun.lock'), '');

      process.chdir(tempParent);

      const result = await scanRepoForRequestedPackages('repo', ['zod']);

      expect(result.repo.root).toBe('repo');
      expect(result.packages[0]?.declaredVersions).toEqual(
        expect.arrayContaining(['^4.3.6', '^5.0.0']),
      );
    } finally {
      process.chdir(previousCwd);
      await rm(tempParent, { recursive: true, force: true });
    }
  });
});

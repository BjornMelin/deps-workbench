import { mkdtemp, rm, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, test } from 'bun:test';

import {
  assertPathWithinRepoRoot,
  ensureLocalStateDirectories,
  resolveCacheDirectory,
  resolveLocalStatePaths,
  resolveRunDirectory,
} from '../src/core/storage/paths';

describe('local state paths', () => {
  test('resolves the canonical .local structure under the repo root', async () => {
    const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'deps-workbench-'));

    try {
      const paths = resolveLocalStatePaths(repoRoot);

      expect(paths.repoRoot).toBe(path.resolve(repoRoot));
      expect(paths.localRoot).toBe(path.join(repoRoot, '.local'));
      expect(paths.runsRoot).toBe(path.join(repoRoot, '.local', 'runs'));
      expect(paths.cacheRoot).toBe(path.join(repoRoot, '.local', 'cache'));
      expect(paths.configRoot).toBe(path.join(repoRoot, '.local', 'config'));
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  test('creates local state directories under the repo root', async () => {
    const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'deps-workbench-'));
    try {
      const paths = await ensureLocalStateDirectories(repoRoot);

      await Promise.all([
        stat(paths.runsRoot),
        stat(paths.cacheRoot),
        stat(paths.configRoot),
      ]);
    } finally {
      await rm(repoRoot, { recursive: true, force: true });
    }
  });

  test('rejects paths that escape the repo root', () => {
    expect(() =>
      assertPathWithinRepoRoot('/repo', path.join('/repo', '..', 'outside')),
    ).toThrow();
  });

  test('builds run and cache directories inside the repo root', () => {
    expect(resolveRunDirectory('/repo', 'run_123')).toBe(
      path.join('/repo', '.local', 'runs', 'run_123'),
    );
    expect(resolveCacheDirectory('/repo', 'docs', 'abc123')).toBe(
      path.join('/repo', '.local', 'cache', 'docs', 'abc123'),
    );
    expect(() => resolveRunDirectory('/repo', '../escape')).toThrow();
    expect(() => resolveCacheDirectory('/repo', 'docs', '../../escape')).toThrow();
  });
});

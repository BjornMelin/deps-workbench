import { mkdtemp } from 'node:fs/promises';
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
  test('resolves the canonical .local structure under the repo root', () => {
    const paths = resolveLocalStatePaths('/repo');

    expect(paths.localRoot).toBe(path.join('/repo', '.local'));
    expect(paths.runsRoot).toBe(path.join('/repo', '.local', 'runs'));
    expect(paths.cacheRoot).toBe(path.join('/repo', '.local', 'cache'));
    expect(paths.configRoot).toBe(path.join('/repo', '.local', 'config'));
  });

  test('creates local state directories under the repo root', async () => {
    const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'deps-workbench-'));
    const paths = await ensureLocalStateDirectories(repoRoot);

    expect(paths.runsRoot.endsWith(path.join('.local', 'runs'))).toBe(true);
    expect(paths.cacheRoot.endsWith(path.join('.local', 'cache'))).toBe(true);
    expect(paths.configRoot.endsWith(path.join('.local', 'config'))).toBe(true);
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
  });
});

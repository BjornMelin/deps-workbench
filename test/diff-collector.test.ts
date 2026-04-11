import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  buildDiffPackageEntry,
  collectDiffArtifact,
  diffResultCollected,
  diffResultError,
} from '../src/core/collectors/diff';
import { sourcePathsArtifactSchema } from '../src/schemas';

const tempRoots: string[] = [];

async function makeTempRoot(): Promise<string> {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), 'deps-workbench-diff-collector-'),
  );
  tempRoots.push(tempRoot);
  return tempRoot;
}

function makeSourcePathsArtifact(currentPath: string, targetPath: string) {
  return sourcePathsArtifactSchema.parse({
    schemaVersion: '1',
    family: 'source_paths',
    generatedAt: '2026-04-10T12:00:00.000Z',
    packages: [
      {
        package: 'zod',
        repository: 'colinhacks/zod',
        status: 'collected',
        current: {
          spec: 'zod@4.3.6',
          version: '4.3.6',
          path: currentPath,
        },
        target: {
          spec: 'zod@4.4.0',
          version: '4.4.0',
          path: targetPath,
        },
      },
    ],
    provenance: {
      sourceFamilies: ['opensrc'],
      commands: ['opensrc path zod'],
      freshness: 'fresh',
      notes: [],
    },
  });
}

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((tempRoot) => rm(tempRoot, { recursive: true, force: true })),
  );
});

describe('collectDiffArtifact', () => {
  test('skips identical source paths through the full collector', async () => {
    const tempRoot = await makeTempRoot();
    const repoRoot = path.join(tempRoot, 'repo');
    const sourcePath = path.join(repoRoot, 'shared');

    await mkdir(sourcePath, { recursive: true });

    const artifact = await collectDiffArtifact({
      repoRoot,
      generatedAt: '2026-04-10T12:00:00.000Z',
      sourcePaths: makeSourcePathsArtifact(sourcePath, sourcePath),
    });

    expect(artifact.family).toBe('diff');
    expect(artifact.packages).toHaveLength(1);
    expect(artifact.packages[0]?.package).toBe('zod');
    expect(artifact.packages[0]?.status).toBe('skipped');
  });

  test('treats exit code 1 with diff output as collected evidence', async () => {
    const tempRoot = await makeTempRoot();
    const currentPath = path.join(tempRoot, 'current');
    const targetPath = path.join(tempRoot, 'target');

    await mkdir(currentPath, { recursive: true });
    await mkdir(targetPath, { recursive: true });

    const entry = makeSourcePathsArtifact(currentPath, targetPath).packages[0];

    if (entry === undefined) {
      throw new Error('expected a diff entry for the test fixture');
    }
    expect(
      diffResultCollected({
        command: ['git', 'diff'],
        cwd: tempRoot,
        exitCode: 1,
        stdout: ' package.json | 2 +-\n',
        stderr: '',
        timedOut: false,
      }),
    ).toBe(true);
    expect(
      buildDiffPackageEntry({
        entry,
        result: {
          command: ['git', 'diff'],
          cwd: tempRoot,
          exitCode: 1,
          stdout: ' package.json | 2 +-\n',
          stderr: '',
          timedOut: false,
        },
      }),
    ).toEqual(
      expect.objectContaining({
        package: 'zod',
        status: 'collected',
        summaryText: ' package.json | 2 +-\n',
        error: undefined,
      }),
    );
  });

  test('treats missing source paths as degraded instead of collected', async () => {
    const tempRoot = await makeTempRoot();
    const currentPath = path.join(tempRoot, 'current');
    const targetPath = path.join(tempRoot, 'missing');

    await mkdir(currentPath, { recursive: true });
    const entry = makeSourcePathsArtifact(currentPath, targetPath).packages[0];

    if (entry === undefined) {
      throw new Error('expected a diff entry for the test fixture');
    }
    expect(
      buildDiffPackageEntry({
        entry,
        result: {
          command: ['git', 'diff'],
          cwd: tempRoot,
          exitCode: 1,
          stdout: '',
          stderr: `error: Could not access '${targetPath}'`,
          timedOut: false,
        },
      }),
    ).toEqual(
      expect.objectContaining({
        package: 'zod',
        status: 'degraded',
        summaryText: undefined,
        error: `error: Could not access '${targetPath}'`,
      }),
    );
  });

  test('uses a timeout-specific error when git diff times out', () => {
    expect(
      diffResultError(
        {
          command: ['git', 'diff'],
          cwd: '/repo',
          exitCode: null,
          stdout: '',
          stderr: '',
          timedOut: true,
        },
        false,
      ),
    ).toBe('git diff --no-index timed out');
  });
});

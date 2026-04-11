import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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

async function loadCollectDiffArtifact() {
  return (
    await import(
      `../src/core/collectors/diff?test=${Date.now()}-${Math.random()}`
    )
  ).collectDiffArtifact;
}

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((tempRoot) => rm(tempRoot, { recursive: true, force: true })),
  );
});

describe('collectDiffArtifact', () => {
  test('treats exit code 1 with diff output as collected evidence', async () => {
    const collectDiffArtifact = await loadCollectDiffArtifact();
    const tempRoot = await makeTempRoot();
    const currentPath = path.join(tempRoot, 'current');
    const targetPath = path.join(tempRoot, 'target');

    await mkdir(currentPath, { recursive: true });
    await mkdir(targetPath, { recursive: true });
    await Bun.write(
      path.join(currentPath, 'package.json'),
      '{"name":"pkg","version":"1.0.0"}\n',
    );
    await Bun.write(
      path.join(targetPath, 'package.json'),
      '{"name":"pkg","version":"2.0.0"}\n',
    );

    const artifact = await collectDiffArtifact({
      repoRoot: tempRoot,
      generatedAt: '2026-04-10T12:00:00.000Z',
      sourcePaths: makeSourcePathsArtifact(currentPath, targetPath),
    });

    expect(artifact.packages).toEqual([
      expect.objectContaining({
        package: 'zod',
        status: 'collected',
        error: undefined,
      }),
    ]);
    expect(artifact.packages[0]?.summaryText).toContain('package.json');
  });

  test('treats missing source paths as degraded instead of collected', async () => {
    const collectDiffArtifact = await loadCollectDiffArtifact();
    const tempRoot = await makeTempRoot();
    const currentPath = path.join(tempRoot, 'current');
    const targetPath = path.join(tempRoot, 'missing');

    await mkdir(currentPath, { recursive: true });
    await Bun.write(
      path.join(currentPath, 'package.json'),
      '{"name":"pkg","version":"1.0.0"}\n',
    );

    const artifact = await collectDiffArtifact({
      repoRoot: tempRoot,
      generatedAt: '2026-04-10T12:00:00.000Z',
      sourcePaths: makeSourcePathsArtifact(currentPath, targetPath),
    });

    expect(artifact.packages).toEqual([
      expect.objectContaining({
        package: 'zod',
        status: 'degraded',
        summaryText: undefined,
      }),
    ]);
    expect(artifact.packages[0]?.error).toContain('Could not access');
  });
});

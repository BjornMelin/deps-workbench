import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, test } from 'bun:test';

import {
  prepManifestSchema,
  resultManifestSchema,
} from '../src/schemas';

const repoRoot = process.cwd();

async function readFixture(relativePath: string): Promise<unknown> {
  const fixturePath = path.join(repoRoot, 'fixtures', relativePath);
  const contents = await readFile(fixturePath, 'utf8');

  return JSON.parse(contents) as unknown;
}

describe('schema contracts', () => {
  test('accepts the minimal prep manifest fixture', async () => {
    const fixture = await readFixture('schemas/minimal-prep-manifest.json');

    expect(prepManifestSchema.parse(fixture).runId).toBe('run_123');
  });

  test('accepts the minimal result manifest fixture', async () => {
    const fixture = await readFixture('schemas/minimal-result-manifest.json');

    expect(resultManifestSchema.parse(fixture).outcomeClass).toBe(
      'review_required',
    );
  });

  test('rejects a prep manifest without source families', () => {
    expect(() =>
      prepManifestSchema.parse({
        schemaVersion: '1',
        runId: 'run_123',
        mode: 'implementation',
        repoRoot: '/repo',
        artifactRoot: '/repo/.local/runs/run_123/prep',
        createdAt: '2026-04-10T12:00:00.000Z',
        artifactFamilies: ['meta'],
        degradedArtifactFamilies: [],
        sourceFamilies: [],
        cacheKeys: [],
      }),
    ).toThrow();
  });
});

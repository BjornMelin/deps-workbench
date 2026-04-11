import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  evidenceReferenceSchema,
  policySchema,
  prepManifestSchema,
  resultManifestSchema,
} from '../src/schemas';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

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

  test('rejects a result manifest with a blocked outcome and mismatched action', async () => {
    const fixture = (await readFixture(
      'schemas/minimal-result-manifest.json',
    )) as Record<string, unknown>;

    expect(() =>
      resultManifestSchema.parse({
        ...fixture,
        outcomeClass: 'blocked',
        primaryAction: 'review_key_claims',
      }),
    ).toThrow();
  });

  test('rejects a policy with overlapping routing thresholds', () => {
    expect(() =>
      policySchema.parse({
        modes: {
          default: 'implementation',
          allowed: ['triage', 'research', 'implementation'],
        },
        modelRouting: {
          tiers: {
            nano: 'gpt-5.4-nano',
            mini: 'gpt-5.4-mini',
            full: 'gpt-5.4',
          },
          thresholds: {
            triageNanoMax: 72,
            fullEscalationMin: 58,
            recoveryEscalationMin: 58,
          },
          weights: {
            upgradeSeverity: 25,
            evidenceConflict: 20,
            repoBlastRadius: 20,
            apiSurfaceMovement: 15,
            replacementOpportunity: 10,
            uncertainty: 5,
            coupling: 5,
          },
        },
        recovery: {
          maxAutomaticHops: 1,
          allowedActions: ['re_run_with_escalation'],
        },
        frameworkEnrichments: ['react'],
      }),
    ).toThrow();
  });

  test('rejects evidence references that are not locatable', () => {
    expect(() =>
      evidenceReferenceSchema.parse({
        artifactFamily: 'docs',
      }),
    ).toThrow();
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

  test('rejects a prep manifest with degraded families outside artifact families', async () => {
    const fixture = (await readFixture(
      'schemas/minimal-prep-manifest.json',
    )) as Record<string, unknown>;

    expect(() =>
      prepManifestSchema.parse({
        ...fixture,
        artifactFamilies: [
          'meta',
          'docs',
          'releases',
          'source_paths',
          'diff',
          'usage',
        ],
        degradedArtifactFamilies: ['signals'],
      }),
    ).toThrow();
  });
});

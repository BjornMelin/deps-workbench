import { describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadCheckedInPolicy,
  PolicyLoadError,
} from '../src/core/policy/load-policy';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

describe('checked-in policy loading', () => {
  test('loads the checked-in repo policy', async () => {
    const policy = await loadCheckedInPolicy(repoRoot);

    expect(policy.modes.default).toBe('implementation');
    expect(policy.recovery.maxAutomaticHops).toBe(1);
  });

  test('raises a policy load error for invalid policy config', async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'deps-workbench-'));
    try {
      const configDirectory = path.join(tempRoot, 'config');
      const fixturePath = path.join(
        repoRoot,
        'fixtures',
        'policy',
        'invalid-config.jsonc',
      );
      const invalidConfig = await readFile(fixturePath, 'utf8');

      await mkdir(configDirectory, { recursive: true });
      await writeFile(
        path.join(configDirectory, 'deps-workbench.config.jsonc'),
        invalidConfig,
        'utf8',
      );

      await expect(loadCheckedInPolicy(tempRoot)).rejects.toBeInstanceOf(
        PolicyLoadError,
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});

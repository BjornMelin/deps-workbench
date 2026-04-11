import {
  afterEach,
  describe,
  expect,
  mock,
  setSystemTime,
  test,
} from 'bun:test';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  diffArtifactSchema,
  docsArtifactSchema,
  type PreflightSummary,
  prepManifestSchema,
  releasesArtifactSchema,
  sourcePathsArtifactSchema,
  usageArtifactSchema,
} from '../src/schemas';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const fixtureRepoRoot = path.join(repoRoot, 'fixtures', 'prep', 'repo-basic');

async function makeTempRepo(): Promise<string> {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), 'deps-workbench-phase3-'),
  );
  await cp(fixtureRepoRoot, tempRoot, { recursive: true });
  return tempRoot;
}

function getRequestedPackageSpec(request: { packages: string[] }): string {
  const requestedPackage = request.packages[0];

  if (requestedPackage === undefined) {
    throw new Error('expected fixture request to include at least one package');
  }

  return requestedPackage;
}

function availablePreflight(): PreflightSummary {
  return {
    tools: [
      {
        toolName: 'bun',
        requirement: 'required',
        available: true,
        executablePath: '/usr/bin/bun',
        version: '1.3.12',
        notes: [],
      },
      {
        toolName: 'opensrc',
        requirement: 'required',
        available: true,
        executablePath: '/usr/bin/opensrc',
        version: '0.0.0',
        notes: [],
      },
      {
        toolName: 'ctx7',
        requirement: 'optional',
        available: true,
        executablePath: '/usr/bin/ctx7',
        version: '0.0.0',
        notes: [],
      },
      {
        toolName: 'gh',
        requirement: 'optional',
        available: true,
        executablePath: '/usr/bin/gh',
        version: '2.89.0',
        notes: [],
      },
    ],
    missingRequiredTools: [],
    missingOptionalTools: [],
  };
}

type PrepareBundleTestOverrides = {
  probeTools?: () => Promise<PreflightSummary>;
  collectDocsArtifact?: (input: {
    generatedAt: string;
  }) => Promise<ReturnType<typeof docsArtifactSchema.parse>>;
  collectReleasesArtifact?: (input: {
    generatedAt: string;
  }) => Promise<ReturnType<typeof releasesArtifactSchema.parse>>;
  collectSourcePathsArtifact?: (input: {
    generatedAt: string;
    request: { packages: string[] };
  }) => Promise<ReturnType<typeof sourcePathsArtifactSchema.parse>>;
  collectUsageArtifact?: (input: {
    generatedAt: string;
    packages: Array<{ declaredVersions: string[] }>;
  }) => Promise<ReturnType<typeof usageArtifactSchema.parse>>;
  collectDiffArtifact?: (input: {
    generatedAt: string;
  }) => Promise<ReturnType<typeof diffArtifactSchema.parse>>;
};

async function loadCreatePrepBundle(
  overrides: PrepareBundleTestOverrides = {},
) {
  mock.module('../src/core/preflight/tools', () => ({
    probeExternalTools:
      overrides.probeTools ?? (async () => availablePreflight()),
  }));

  if (overrides.collectSourcePathsArtifact) {
    mock.module('../src/core/collectors/opensrc', () => ({
      collectSourcePathsArtifact: overrides.collectSourcePathsArtifact,
    }));
  }

  if (overrides.collectDocsArtifact) {
    mock.module('../src/core/collectors/ctx7', () => ({
      collectDocsArtifact: overrides.collectDocsArtifact,
    }));
  }

  if (overrides.collectReleasesArtifact) {
    mock.module('../src/core/collectors/github', () => ({
      collectReleasesArtifact: overrides.collectReleasesArtifact,
    }));
  }

  if (overrides.collectUsageArtifact) {
    mock.module('../src/core/collectors/bun', () => ({
      collectUsageArtifact: overrides.collectUsageArtifact,
    }));
  }

  if (overrides.collectDiffArtifact) {
    mock.module('../src/core/collectors/diff', () => ({
      collectDiffArtifact: overrides.collectDiffArtifact,
    }));
  }

  return (await import('../src/core/prep/prepare-bundle')).createPrepBundle;
}

afterEach(() => {
  mock.restore();
  setSystemTime();
});

describe('createPrepBundle', () => {
  test('parses OpenSRC cache paths with Windows separators', async () => {
    const { parseRepositoryFromSourcePath, parseVersionFromSourcePath } =
      await import('../src/core/collectors/opensrc');
    const sourcePath =
      'C:\\Users\\bjorn\\.opensrc\\repos\\github.com\\colinhacks\\zod\\4.4.0';

    expect(parseRepositoryFromSourcePath(sourcePath)).toBe('colinhacks/zod');
    expect(parseVersionFromSourcePath(sourcePath)).toBe('4.4.0');
  });

  test('writes the canonical prep bundle artifacts', async () => {
    const tempRepo = await makeTempRepo();

    try {
      setSystemTime(new Date('2026-04-10T12:00:00.000Z'));
      const createPrepBundle = await loadCreatePrepBundle({
        collectSourcePathsArtifact: async ({ generatedAt, request }) =>
          sourcePathsArtifactSchema.parse({
            schemaVersion: '1',
            family: 'source_paths',
            generatedAt,
            packages: [
              {
                package: 'zod',
                repository: 'colinhacks/zod',
                status: 'collected',
                current: {
                  spec: getRequestedPackageSpec(request),
                  version: '4.3.6',
                  path: '/tmp/opensrc/zod/4.3.6',
                },
                target: {
                  spec: 'zod@4.4.0',
                  version: '4.4.0',
                  path: '/tmp/opensrc/zod/4.4.0',
                },
              },
            ],
            provenance: {
              sourceFamilies: ['opensrc'],
              commands: ['opensrc path zod --cwd repo'],
              freshness: 'fresh',
              notes: [],
            },
          }),
        collectDocsArtifact: async ({ generatedAt }) =>
          docsArtifactSchema.parse({
            schemaVersion: '1',
            family: 'docs',
            generatedAt,
            packages: [
              {
                package: 'zod',
                query: 'migration guide breaking changes latest version',
                libraryId: '/colinhacks/zod',
                status: 'collected',
                raw: { ok: true },
              },
            ],
            provenance: {
              sourceFamilies: ['ctx7'],
              commands: ['ctx7 library zod ...'],
              freshness: 'fresh',
              notes: [],
            },
          }),
        collectReleasesArtifact: async ({ generatedAt }) =>
          releasesArtifactSchema.parse({
            schemaVersion: '1',
            family: 'releases',
            generatedAt,
            packages: [
              {
                package: 'zod',
                repository: 'colinhacks/zod',
                status: 'collected',
                releases: [
                  {
                    tagName: 'v4.4.0',
                    name: 'v4.4.0',
                    publishedAt: '2026-04-09T00:00:00Z',
                    isLatest: true,
                  },
                ],
              },
            ],
            provenance: {
              sourceFamilies: ['gh'],
              commands: ['gh release list --repo colinhacks/zod --limit 10'],
              freshness: 'fresh',
              notes: [],
            },
          }),
        collectUsageArtifact: async ({ generatedAt, packages }) =>
          usageArtifactSchema.parse({
            schemaVersion: '1',
            family: 'usage',
            generatedAt,
            packages: [
              {
                package: 'zod',
                status: 'collected',
                whyText: 'zod@4.3.6\\n  └─ fixture-repo-basic',
                auditJson: {},
                declaredVersions: packages[0]?.declaredVersions ?? [],
              },
            ],
            provenance: {
              sourceFamilies: ['bun'],
              commands: ['bun why zod --top --depth 4'],
              freshness: 'fresh',
              notes: [],
            },
          }),
        collectDiffArtifact: async ({ generatedAt }) =>
          diffArtifactSchema.parse({
            schemaVersion: '1',
            family: 'diff',
            generatedAt,
            packages: [
              {
                package: 'zod',
                status: 'collected',
                currentPath: '/tmp/opensrc/zod/4.3.6',
                targetPath: '/tmp/opensrc/zod/4.4.0',
                summaryText:
                  ' 12 files changed, 200 insertions(+), 10 deletions(-)',
              },
            ],
            provenance: {
              sourceFamilies: ['git', 'opensrc'],
              commands: ['git diff --no-index --stat --summary -- ...'],
              freshness: 'fresh',
              notes: [],
            },
          }),
      });
      const result = await createPrepBundle({
        repoRoot: tempRepo,
        packages: ['zod'],
        targetVersion: '4.4.0',
        runId: 'run_fixture_a',
      });

      const manifest = prepManifestSchema.parse(
        JSON.parse(
          await readFile(result.manifest.artifactFiles.manifest, 'utf8'),
        ),
      );

      expect(manifest.runId).toBe('run_fixture_a');
      expect(manifest.degradedArtifactFamilies).toEqual([]);
      expect(manifest.artifactFamilies).toContain('signals');

      const docsArtifact = docsArtifactSchema.parse(
        JSON.parse(await readFile(result.manifest.artifactFiles.docs, 'utf8')),
      );
      expect(docsArtifact.packages[0]?.libraryId).toBe('/colinhacks/zod');
    } finally {
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  test('records degraded artifact families when collectors degrade', async () => {
    const tempRepo = await makeTempRepo();

    try {
      setSystemTime(new Date('2026-04-10T12:05:00.000Z'));
      const createPrepBundle = await loadCreatePrepBundle({
        collectSourcePathsArtifact: async ({ generatedAt, request }) =>
          sourcePathsArtifactSchema.parse({
            schemaVersion: '1',
            family: 'source_paths',
            generatedAt,
            packages: [
              {
                package: 'zod',
                repository: 'colinhacks/zod',
                status: 'collected',
                current: {
                  spec: getRequestedPackageSpec(request),
                  version: '4.3.6',
                  path: '/tmp/opensrc/zod/4.3.6',
                },
              },
            ],
            provenance: {
              sourceFamilies: ['opensrc'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          }),
        collectDocsArtifact: async ({ generatedAt }) =>
          docsArtifactSchema.parse({
            schemaVersion: '1',
            family: 'docs',
            generatedAt,
            packages: [
              {
                package: 'zod',
                query: 'migration guide breaking changes latest version',
                status: 'degraded',
                error: 'ctx7 unavailable during preflight',
              },
            ],
            provenance: {
              sourceFamilies: ['ctx7'],
              commands: [],
              freshness: 'fresh',
              notes: ['ctx7 unavailable during preflight'],
            },
          }),
        collectReleasesArtifact: async ({ generatedAt }) =>
          releasesArtifactSchema.parse({
            schemaVersion: '1',
            family: 'releases',
            generatedAt,
            packages: [
              {
                package: 'zod',
                repository: 'colinhacks/zod',
                status: 'degraded',
                releases: [],
                error: 'gh unavailable during preflight',
              },
            ],
            provenance: {
              sourceFamilies: ['gh'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          }),
        collectUsageArtifact: async ({ generatedAt }) =>
          usageArtifactSchema.parse({
            schemaVersion: '1',
            family: 'usage',
            generatedAt,
            packages: [
              {
                package: 'zod',
                status: 'collected',
                whyText: 'zod@4.3.6',
                auditJson: {},
                declaredVersions: ['^4.3.6'],
              },
            ],
            provenance: {
              sourceFamilies: ['bun'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          }),
        collectDiffArtifact: async ({ generatedAt }) =>
          diffArtifactSchema.parse({
            schemaVersion: '1',
            family: 'diff',
            generatedAt,
            packages: [
              {
                package: 'zod',
                status: 'skipped',
                currentPath: '/tmp/opensrc/zod/4.3.6',
                error:
                  'source diff requires both current and target source paths',
              },
            ],
            provenance: {
              sourceFamilies: ['git', 'opensrc'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          }),
      });
      const result = await createPrepBundle({
        repoRoot: tempRepo,
        packages: ['zod'],
        runId: 'run_fixture_b',
      });

      expect(result.manifest.degradedArtifactFamilies).toEqual(
        expect.arrayContaining(['docs', 'releases', 'diff']),
      );
      expect(
        result.signals.packages[0]?.signals.some(
          (signal) => signal.name === 'target_version_unspecified',
        ),
      ).toBe(true);
      expect(
        result.signals.packages[0]?.signals.some(
          (signal) => signal.name === 'source_diff_skipped',
        ),
      ).toBe(true);
    } finally {
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  test('emits a diff warning signal when diff collection degrades', async () => {
    const tempRepo = await makeTempRepo();

    try {
      const createPrepBundle = await loadCreatePrepBundle({
        collectSourcePathsArtifact: async ({ generatedAt, request }) =>
          sourcePathsArtifactSchema.parse({
            schemaVersion: '1',
            family: 'source_paths',
            generatedAt,
            packages: [
              {
                package: 'zod',
                repository: 'colinhacks/zod',
                status: 'collected',
                current: {
                  spec: getRequestedPackageSpec(request),
                  version: '4.3.6',
                  path: '/tmp/opensrc/zod/4.3.6',
                },
                target: {
                  spec: 'zod@4.4.0',
                  version: '4.4.0',
                  path: '/tmp/opensrc/zod/4.4.0',
                },
              },
            ],
            provenance: {
              sourceFamilies: ['opensrc'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          }),
        collectDocsArtifact: async ({ generatedAt }) =>
          docsArtifactSchema.parse({
            schemaVersion: '1',
            family: 'docs',
            generatedAt,
            packages: [
              {
                package: 'zod',
                query: 'migration guide breaking changes latest version',
                status: 'collected',
                raw: { ok: true },
              },
            ],
            provenance: {
              sourceFamilies: ['ctx7'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          }),
        collectReleasesArtifact: async ({ generatedAt }) =>
          releasesArtifactSchema.parse({
            schemaVersion: '1',
            family: 'releases',
            generatedAt,
            packages: [
              {
                package: 'zod',
                repository: 'colinhacks/zod',
                status: 'collected',
                releases: [],
              },
            ],
            provenance: {
              sourceFamilies: ['gh'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          }),
        collectUsageArtifact: async ({ generatedAt }) =>
          usageArtifactSchema.parse({
            schemaVersion: '1',
            family: 'usage',
            generatedAt,
            packages: [
              {
                package: 'zod',
                status: 'collected',
                whyText: 'zod@4.3.6',
                auditJson: {},
                declaredVersions: ['^4.3.6'],
              },
            ],
            provenance: {
              sourceFamilies: ['bun'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          }),
        collectDiffArtifact: async ({ generatedAt }) =>
          diffArtifactSchema.parse({
            schemaVersion: '1',
            family: 'diff',
            generatedAt,
            packages: [
              {
                package: 'zod',
                status: 'degraded',
                currentPath: '/tmp/opensrc/zod/4.3.6',
                targetPath: '/tmp/opensrc/zod/4.4.0',
                error: 'git diff timed out',
              },
            ],
            provenance: {
              sourceFamilies: ['git', 'opensrc'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          }),
      });

      const result = await createPrepBundle({
        repoRoot: tempRepo,
        packages: ['zod'],
        targetVersion: '4.4.0',
        runId: 'run_fixture_diff_degraded',
      });

      expect(
        result.signals.packages[0]?.signals.some(
          (signal) => signal.name === 'source_diff_incomplete',
        ),
      ).toBe(true);
    } finally {
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  test('reuses cached artifacts when inputs match', async () => {
    const tempRepo = await makeTempRepo();
    let docsCalls = 0;
    let sourceCalls = 0;

    try {
      setSystemTime(new Date('2026-04-10T12:10:00.000Z'));
      // Cache keys are derived from artifact family plus cache input, so two
      // runs in the same repo reuse the same on-disk cache even when runId changes.
      const createPrepBundle = await loadCreatePrepBundle({
        collectSourcePathsArtifact: async ({ generatedAt, request }) => {
          sourceCalls += 1;
          return sourcePathsArtifactSchema.parse({
            schemaVersion: '1',
            family: 'source_paths',
            generatedAt,
            packages: [
              {
                package: 'zod',
                repository: 'colinhacks/zod',
                status: 'collected',
                current: {
                  spec: getRequestedPackageSpec(request),
                  version: '4.3.6',
                  path: '/tmp/opensrc/zod/4.3.6',
                },
              },
            ],
            provenance: {
              sourceFamilies: ['opensrc'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          });
        },
        collectDocsArtifact: async ({ generatedAt }) => {
          docsCalls += 1;
          return docsArtifactSchema.parse({
            schemaVersion: '1',
            family: 'docs',
            generatedAt,
            packages: [
              {
                package: 'zod',
                query: 'migration guide breaking changes latest version',
                libraryId: '/colinhacks/zod',
                status: 'collected',
                raw: { ok: true },
              },
            ],
            provenance: {
              sourceFamilies: ['ctx7'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          });
        },
        collectReleasesArtifact: async ({ generatedAt }) =>
          releasesArtifactSchema.parse({
            schemaVersion: '1',
            family: 'releases',
            generatedAt,
            packages: [
              {
                package: 'zod',
                repository: 'colinhacks/zod',
                status: 'collected',
                releases: [],
              },
            ],
            provenance: {
              sourceFamilies: ['gh'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          }),
        collectUsageArtifact: async ({ generatedAt }) =>
          usageArtifactSchema.parse({
            schemaVersion: '1',
            family: 'usage',
            generatedAt,
            packages: [
              {
                package: 'zod',
                status: 'collected',
                whyText: 'zod@4.3.6',
                auditJson: {},
                declaredVersions: ['^4.3.6'],
              },
            ],
            provenance: {
              sourceFamilies: ['bun'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          }),
        collectDiffArtifact: async ({ generatedAt }) =>
          diffArtifactSchema.parse({
            schemaVersion: '1',
            family: 'diff',
            generatedAt,
            packages: [
              {
                package: 'zod',
                status: 'skipped',
                currentPath: '/tmp/opensrc/zod/4.3.6',
                error:
                  'source diff requires both current and target source paths',
              },
            ],
            provenance: {
              sourceFamilies: ['git', 'opensrc'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          }),
      });

      await createPrepBundle({
        repoRoot: tempRepo,
        packages: ['zod'],
        runId: 'run_fixture_cache_a',
      });
      await createPrepBundle({
        repoRoot: tempRepo,
        packages: ['zod'],
        runId: 'run_fixture_cache_b',
      });

      expect(sourceCalls).toBe(1);
      expect(docsCalls).toBe(1);
    } finally {
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  test('starts usage collection in parallel with source path collection', async () => {
    const tempRepo = await makeTempRepo();
    const startedFamilies: string[] = [];
    let releaseSourcePaths: (() => void) | undefined;
    const sourcePathsReady = new Promise<void>((resolve) => {
      releaseSourcePaths = resolve;
    });
    const maybeReleaseSourcePaths = () => {
      if (
        startedFamilies.includes('source_paths') &&
        startedFamilies.includes('usage')
      ) {
        releaseSourcePaths?.();
      }
    };

    try {
      setSystemTime(new Date('2026-04-10T12:15:00.000Z'));
      const createPrepBundle = await loadCreatePrepBundle({
        collectSourcePathsArtifact: async ({ generatedAt, request }) => {
          startedFamilies.push('source_paths');
          maybeReleaseSourcePaths();
          await sourcePathsReady;
          return sourcePathsArtifactSchema.parse({
            schemaVersion: '1',
            family: 'source_paths',
            generatedAt,
            packages: [
              {
                package: 'zod',
                repository: 'colinhacks/zod',
                status: 'collected',
                current: {
                  spec: getRequestedPackageSpec(request),
                  version: '4.3.6',
                  path: '/tmp/opensrc/zod/4.3.6',
                },
              },
            ],
            provenance: {
              sourceFamilies: ['opensrc'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          });
        },
        collectUsageArtifact: async ({ generatedAt }) => {
          startedFamilies.push('usage');
          maybeReleaseSourcePaths();
          return usageArtifactSchema.parse({
            schemaVersion: '1',
            family: 'usage',
            generatedAt,
            packages: [
              {
                package: 'zod',
                status: 'collected',
                whyText: 'zod@4.3.6',
                auditJson: {},
                declaredVersions: ['^4.3.6'],
              },
            ],
            provenance: {
              sourceFamilies: ['bun'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          });
        },
        collectDocsArtifact: async ({ generatedAt }) =>
          docsArtifactSchema.parse({
            schemaVersion: '1',
            family: 'docs',
            generatedAt,
            packages: [
              {
                package: 'zod',
                query: 'migration guide breaking changes latest version',
                status: 'degraded',
                error: 'ctx7 unavailable during preflight',
              },
            ],
            provenance: {
              sourceFamilies: ['ctx7'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          }),
        collectReleasesArtifact: async ({ generatedAt }) =>
          releasesArtifactSchema.parse({
            schemaVersion: '1',
            family: 'releases',
            generatedAt,
            packages: [
              {
                package: 'zod',
                repository: 'colinhacks/zod',
                status: 'degraded',
                releases: [],
                error: 'gh unavailable during preflight',
              },
            ],
            provenance: {
              sourceFamilies: ['gh'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          }),
        collectDiffArtifact: async ({ generatedAt }) =>
          diffArtifactSchema.parse({
            schemaVersion: '1',
            family: 'diff',
            generatedAt,
            packages: [
              {
                package: 'zod',
                status: 'skipped',
                currentPath: '/tmp/opensrc/zod/4.3.6',
                error:
                  'source diff requires both current and target source paths',
              },
            ],
            provenance: {
              sourceFamilies: ['git', 'opensrc'],
              commands: [],
              freshness: 'fresh',
              notes: [],
            },
          }),
      });
      await createPrepBundle({
        repoRoot: tempRepo,
        packages: ['zod'],
        runId: 'run_fixture_parallel_a',
      });

      expect(startedFamilies.slice(0, 2).sort()).toEqual([
        'source_paths',
        'usage',
      ]);
    } finally {
      releaseSourcePaths?.();
      await rm(tempRepo, { recursive: true, force: true });
    }
  });
});

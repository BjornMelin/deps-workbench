import { describe, expect, test } from 'bun:test';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { analysisPromptExample } from '../src/core/models/openai-analysis';
import { loadCheckedInPolicy } from '../src/core/policy/load-policy';
import { analyzePreparedRun } from '../src/core/runtime/analyze-run';
import { loadPrepBundleFromRunId } from '../src/core/runtime/intake';
import { buildRoutingDecision } from '../src/core/runtime/routing';
import { writeJsonFileAtomic } from '../src/core/storage/json';
import { resolvePrepArtifactRoot } from '../src/core/storage/paths';
import {
  analysisSynthesisSchema,
  decisionReportSchema,
  diffArtifactSchema,
  docsArtifactSchema,
  evidenceMapSchema,
  implementationChecklistSchema,
  metaArtifactSchema,
  openQuestionsSchema,
  prepManifestSchema,
  releasesArtifactSchema,
  resultManifestSchema,
  signalsArtifactSchema,
  sourcePathsArtifactSchema,
  usageArtifactSchema,
  validationChecklistSchema,
} from '../src/schemas';

const fixtureRepoRoot = path.join(
  import.meta.dir,
  '..',
  'fixtures',
  'prep',
  'repo-basic',
);

type PrepFixtureOverrides = {
  mode?: 'triage' | 'research' | 'implementation';
  targetVersion?: string;
  currentVersion?: string;
  occurrenceCount?: number;
  docsStatus?: 'collected' | 'degraded';
  releasesStatus?: 'collected' | 'degraded';
  diffStatus?: 'collected' | 'degraded' | 'skipped';
  diffSummaryText?: string;
  degradedArtifactFamilies?: Array<
    'docs' | 'releases' | 'source_paths' | 'diff' | 'usage' | 'signals'
  >;
};

async function makeTempRepo(): Promise<string> {
  const tempRoot = await mkdtemp(
    path.join(os.tmpdir(), 'deps-workbench-phase4-'),
  );
  await cp(fixtureRepoRoot, tempRoot, { recursive: true });
  return tempRoot;
}

async function writePrepFixture(
  repoRoot: string,
  runId: string,
  overrides: PrepFixtureOverrides = {},
): Promise<void> {
  const prepRoot = resolvePrepArtifactRoot(repoRoot, runId);
  const generatedAt = '2026-04-11T08:00:00.000Z';
  const occurrenceCount = overrides.occurrenceCount ?? 1;
  const targetVersion =
    'targetVersion' in overrides ? overrides.targetVersion : '4.4.0';
  const currentVersion = overrides.currentVersion ?? '4.3.6';
  const docsStatus = overrides.docsStatus ?? 'collected';
  const releasesStatus = overrides.releasesStatus ?? 'collected';
  const diffStatus = overrides.diffStatus ?? 'collected';
  const artifactFiles = {
    manifest: path.join(prepRoot, 'manifest.json'),
    meta: path.join(prepRoot, 'meta.json'),
    docs: path.join(prepRoot, 'docs.json'),
    releases: path.join(prepRoot, 'releases.json'),
    sourcePaths: path.join(prepRoot, 'source_paths.json'),
    diff: path.join(prepRoot, 'diff.json'),
    usage: path.join(prepRoot, 'usage.json'),
    signals: path.join(prepRoot, 'signals.json'),
  };

  const meta = metaArtifactSchema.parse({
    schemaVersion: '1',
    family: 'meta',
    generatedAt,
    request: {
      packages: ['zod'],
      targetVersion,
    },
    repo: {
      root: repoRoot,
      packageManager: 'bun@1.3.12',
      hasWorkspaces: true,
      workspaceCount: 1,
      packageJsonCount: 2,
      lockfilePresent: true,
    },
    packages: [
      {
        package: 'zod',
        occurrences: Array.from({ length: occurrenceCount }, (_, index) => ({
          manifestPath:
            index === 0
              ? path.join(repoRoot, 'package.json')
              : path.join(repoRoot, 'packages', 'app', 'package.json'),
          field: 'dependencies',
          spec: '^4.3.6',
        })),
        declaredVersions: ['^4.3.6'],
        resolvedCurrentVersion: currentVersion,
        targetVersion,
      },
    ],
    preflight: {
      tools: [
        {
          toolName: 'bun',
          requirement: 'required',
          available: true,
          executablePath: '/usr/bin/bun',
          version: '1.3.12',
          notes: [],
        },
      ],
      missingRequiredTools: [],
      missingOptionalTools: [],
    },
    provenance: {
      sourceFamilies: ['filesystem'],
      commands: [],
      freshness: 'fresh',
      notes: [],
    },
  });

  const docs = docsArtifactSchema.parse({
    schemaVersion: '1',
    family: 'docs',
    generatedAt,
    packages: [
      {
        package: 'zod',
        query: 'migration guide breaking changes latest version',
        libraryId: docsStatus === 'collected' ? '/colinhacks/zod' : undefined,
        status: docsStatus,
        raw: docsStatus === 'collected' ? { ok: true } : undefined,
        error:
          docsStatus === 'degraded'
            ? 'ctx7 unavailable during preflight'
            : undefined,
      },
    ],
    provenance: {
      sourceFamilies: ['ctx7'],
      commands: [],
      freshness: 'fresh',
      notes: [],
    },
  });

  const releases = releasesArtifactSchema.parse({
    schemaVersion: '1',
    family: 'releases',
    generatedAt,
    packages: [
      {
        package: 'zod',
        repository: 'colinhacks/zod',
        status: releasesStatus,
        releases:
          releasesStatus === 'collected'
            ? [
                {
                  tagName: `v${targetVersion}`,
                  name: `v${targetVersion}`,
                  publishedAt: '2026-04-10T00:00:00Z',
                  isLatest: true,
                },
              ]
            : [],
        error:
          releasesStatus === 'degraded'
            ? 'gh unavailable during preflight'
            : undefined,
      },
    ],
    provenance: {
      sourceFamilies: ['gh'],
      commands: [],
      freshness: 'fresh',
      notes: [],
    },
  });

  const sourcePaths = sourcePathsArtifactSchema.parse({
    schemaVersion: '1',
    family: 'source_paths',
    generatedAt,
    packages: [
      {
        package: 'zod',
        repository: 'colinhacks/zod',
        status: 'collected',
        current: {
          spec: 'zod',
          version: currentVersion,
          path: '/tmp/opensrc/zod/4.3.6',
        },
        target: targetVersion
          ? {
              spec: `zod@${targetVersion}`,
              version: targetVersion,
              path: `/tmp/opensrc/zod/${targetVersion}`,
            }
          : undefined,
      },
    ],
    provenance: {
      sourceFamilies: ['opensrc'],
      commands: [],
      freshness: 'fresh',
      notes: [],
    },
  });

  const diff = diffArtifactSchema.parse({
    schemaVersion: '1',
    family: 'diff',
    generatedAt,
    packages: [
      {
        package: 'zod',
        status: diffStatus,
        currentPath: '/tmp/opensrc/zod/4.3.6',
        targetPath: targetVersion
          ? `/tmp/opensrc/zod/${targetVersion}`
          : undefined,
        summaryText:
          diffStatus === 'collected'
            ? (overrides.diffSummaryText ??
              ' 4 files changed, 35 insertions(+), 8 deletions(-)')
            : undefined,
        error:
          diffStatus !== 'collected'
            ? 'source diff requires both current and target source paths'
            : undefined,
      },
    ],
    provenance: {
      sourceFamilies: ['git', 'opensrc'],
      commands: [],
      freshness: 'fresh',
      notes: [],
    },
  });

  const usage = usageArtifactSchema.parse({
    schemaVersion: '1',
    family: 'usage',
    generatedAt,
    packages: [
      {
        package: 'zod',
        status: 'collected',
        whyText: 'zod@4.3.6\n  └─ fixture-repo-basic',
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

  const signals = signalsArtifactSchema.parse({
    schemaVersion: '1',
    family: 'signals',
    generatedAt,
    packages: [
      {
        package: 'zod',
        signals: [
          {
            name:
              Number(targetVersion?.split('.')[0] ?? '0') >
              Number(currentVersion.split('.')[0])
                ? 'major_version_target_requested'
                : 'minor_version_target_requested',
            severity:
              Number(targetVersion?.split('.')[0] ?? '0') >
              Number(currentVersion.split('.')[0])
                ? 'warn'
                : 'info',
            sourceFamily: 'opensrc',
            detail: `target version ${targetVersion} compared to ${currentVersion}`,
          },
        ],
      },
    ],
    provenance: {
      sourceFamilies: ['filesystem', 'opensrc', 'ctx7', 'gh', 'bun', 'git'],
      commands: [],
      freshness: 'fresh',
      notes: [],
    },
  });

  const manifest = prepManifestSchema.parse({
    schemaVersion: '1',
    runId,
    mode: overrides.mode ?? 'implementation',
    repoRoot,
    artifactRoot: prepRoot,
    createdAt: generatedAt,
    request: {
      packages: ['zod'],
      targetVersion,
    },
    artifactFamilies: [
      'meta',
      'docs',
      'releases',
      'source_paths',
      'diff',
      'usage',
      'signals',
    ],
    degradedArtifactFamilies: overrides.degradedArtifactFamilies ?? [],
    sourceFamilies: ['filesystem', 'ctx7', 'gh', 'opensrc', 'git', 'bun'],
    cacheKeys: [],
    artifactFiles,
    preflight: meta.preflight,
  });

  await Promise.all([
    writeJsonFileAtomic(artifactFiles.meta, meta),
    writeJsonFileAtomic(artifactFiles.docs, docs),
    writeJsonFileAtomic(artifactFiles.releases, releases),
    writeJsonFileAtomic(artifactFiles.sourcePaths, sourcePaths),
    writeJsonFileAtomic(artifactFiles.diff, diff),
    writeJsonFileAtomic(artifactFiles.usage, usage),
    writeJsonFileAtomic(artifactFiles.signals, signals),
    writeJsonFileAtomic(artifactFiles.manifest, manifest),
  ]);
}

function synthesisFixture(
  overrides: Partial<ReturnType<typeof analysisSynthesisSchema.parse>> = {},
) {
  return analysisSynthesisSchema.parse({
    executiveBrief: 'Zod upgrade looks bounded but should be verified.',
    semanticOutcome: 'review_required',
    summary: 'The upgrade is mechanically straightforward with a few checks.',
    topRiskSignals: ['major_version_target_requested'],
    claims: [
      {
        id: 'claim_docs',
        package: 'zod',
        statement: 'Zod upgrade changes a small validation surface.',
        confidence: 0.88,
        bucket: 'SUPPORTED',
        rationale: 'Docs and source diff both indicate limited API movement.',
        evidenceRefs: [
          {
            artifactFamily: 'docs',
            package: 'zod',
            locator: 'docs:zod',
            excerpt: 'migration guide breaking changes latest version',
          },
        ],
      },
      {
        id: 'claim_verify',
        package: 'zod',
        statement: 'One call site still needs local verification.',
        confidence: 0.46,
        bucket: 'UNVERIFIED',
        rationale: 'The prep bundle does not prove the runtime path directly.',
        evidenceRefs: [
          {
            artifactFamily: 'usage',
            package: 'zod',
            locator: 'usage:zod',
          },
        ],
      },
    ],
    implementationChecklist: [
      {
        id: 'update_imports',
        package: 'zod',
        targetFile: '/repo/src/example.ts',
        whyAffected: 'The file imports zod directly.',
        currentPattern: "import { z } from 'zod';",
        targetPattern: "import { z } from 'zod';",
        changeIntent: 'verify_only',
        confidence: 0.72,
        evidenceRefs: [
          {
            artifactFamily: 'usage',
            package: 'zod',
            locator: 'usage:zod',
          },
        ],
        validationSteps: ['Run bun test after reviewing imports.'],
      },
    ],
    validationChecklist: [
      {
        id: 'run_tests',
        package: 'zod',
        description: 'Run the repo tests after the upgrade changes.',
        command: 'bun run test',
        rationale: 'Catches local validation regressions.',
        required: true,
        evidenceRefs: [],
      },
    ],
    openQuestions: [],
    ...overrides,
  });
}

describe('buildRoutingDecision', () => {
  test('keeps low-risk triage runs on nano', async () => {
    const tempRepo = await makeTempRepo();

    try {
      await writePrepFixture(tempRepo, 'run_low_risk', {
        mode: 'triage',
        targetVersion: '4.4.0',
        occurrenceCount: 1,
        diffSummaryText: ' 1 file changed, 2 insertions(+), 1 deletion(-)',
      });
      const prepBundle = await loadPrepBundleFromRunId(
        tempRepo,
        'run_low_risk',
      );
      const policy = await loadCheckedInPolicy(tempRepo);

      const decision = buildRoutingDecision({ prepBundle, policy });

      expect(decision.selectedTier).toBe('nano');
    } finally {
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  test('escalates high-risk implementation runs to full', async () => {
    const tempRepo = await makeTempRepo();

    try {
      await writePrepFixture(tempRepo, 'run_high_risk', {
        mode: 'implementation',
        targetVersion: '5.0.0',
        occurrenceCount: 20,
        docsStatus: 'degraded',
        releasesStatus: 'degraded',
        degradedArtifactFamilies: ['docs', 'releases'],
        diffSummaryText:
          ' 24 files changed, 480 insertions(+), 140 deletions(-)',
      });
      const prepBundle = await loadPrepBundleFromRunId(
        tempRepo,
        'run_high_risk',
      );
      const policy = await loadCheckedInPolicy(tempRepo);

      const decision = buildRoutingDecision({ prepBundle, policy });

      expect(decision.selectedTier).toBe('full');
      expect(decision.escalationScore).toBeGreaterThanOrEqual(72);
    } finally {
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  test('scores 0.x to 1.x upgrades as high risk', async () => {
    const tempRepo = await makeTempRepo();

    try {
      await writePrepFixture(tempRepo, 'run_major_boundary', {
        mode: 'implementation',
        currentVersion: '0.9.0',
        targetVersion: '1.0.0',
        occurrenceCount: 1,
        diffSummaryText: ' 2 files changed, 12 insertions(+), 3 deletions(-)',
      });
      const prepBundle = await loadPrepBundleFromRunId(
        tempRepo,
        'run_major_boundary',
      );
      const policy = await loadCheckedInPolicy(tempRepo);

      const decision = buildRoutingDecision({ prepBundle, policy });

      expect(
        decision.factors.find((factor) => factor.category === 'upgradeSeverity')
          ?.rawScore,
      ).toBe(100);
    } finally {
      await rm(tempRepo, { recursive: true, force: true });
    }
  });
});

describe('analyzePreparedRun', () => {
  test('blocks implementation runs that are missing the target pillar', async () => {
    const tempRepo = await makeTempRepo();
    let modelCalls = 0;

    try {
      await writePrepFixture(tempRepo, 'run_blocked', {
        mode: 'implementation',
        targetVersion: undefined,
      });

      const result = await analyzePreparedRun(
        { repoRoot: tempRepo, runId: 'run_blocked' },
        {
          now: () => new Date('2026-04-11T08:15:00.000Z'),
          modelExecutor: async () => {
            modelCalls += 1;
            return {
              synthesis: synthesisFixture(),
              modelUsed: 'gpt-5.4-mini',
            };
          },
        },
      );

      expect(modelCalls).toBe(0);
      expect(result.manifest.outcomeClass).toBe('blocked');
      expect(result.manifest.primaryAction).toBe('stop_blocked');
      expect(result.manifest.modelUsed).toBeUndefined();
      expect(
        decisionReportSchema.parse(
          JSON.parse(
            await Bun.file(result.manifest.resultFiles.decisionReport).text(),
          ) as unknown,
        ).semanticOutcome,
      ).toBe('blocked');
    } finally {
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  test('blocks implementation runs when a requested package is missing from metadata', async () => {
    const tempRepo = await makeTempRepo();
    let modelCalls = 0;

    try {
      const runId = 'run_missing_requested_package';
      await writePrepFixture(tempRepo, runId, {
        mode: 'implementation',
        targetVersion: '4.4.0',
      });

      const manifestPath = path.join(
        resolvePrepArtifactRoot(tempRepo, runId),
        'manifest.json',
      );
      const manifest = prepManifestSchema.parse(
        JSON.parse(await Bun.file(manifestPath).text()) as unknown,
      );

      await writeJsonFileAtomic(manifestPath, {
        ...manifest,
        request: {
          ...manifest.request,
          packages: ['zod', 'left-pad'],
        },
      });

      const result = await analyzePreparedRun(
        { repoRoot: tempRepo, runId },
        {
          now: () => new Date('2026-04-11T08:15:30.000Z'),
          modelExecutor: async () => {
            modelCalls += 1;
            return {
              synthesis: synthesisFixture(),
              modelUsed: 'gpt-5.4-mini',
            };
          },
        },
      );

      expect(modelCalls).toBe(0);
      expect(result.manifest.outcomeClass).toBe('blocked');
      expect(result.manifest.stopConditions).toContain(
        'left-pad: dependency metadata is missing',
      );
    } finally {
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  test('rejects prep bundles whose artifact files escape the run boundary', async () => {
    const tempRepo = await makeTempRepo();
    const runId = 'run_escape';

    try {
      await writePrepFixture(tempRepo, runId, {
        mode: 'implementation',
      });

      const manifestPath = path.join(
        resolvePrepArtifactRoot(tempRepo, runId),
        'manifest.json',
      );
      const manifest = prepManifestSchema.parse(
        JSON.parse(await Bun.file(manifestPath).text()) as unknown,
      );

      await writeJsonFileAtomic(manifestPath, {
        ...manifest,
        artifactFiles: {
          ...manifest.artifactFiles,
          meta: path.join(tempRepo, '..', 'outside.json'),
        },
      });

      await expect(loadPrepBundleFromRunId(tempRepo, runId)).rejects.toThrow(
        /outside/,
      );
    } finally {
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  test('records a single bounded escalation recovery hop', async () => {
    const tempRepo = await makeTempRepo();
    let modelCalls = 0;

    try {
      await writePrepFixture(tempRepo, 'run_recovery', {
        mode: 'implementation',
        targetVersion: '5.0.0',
        occurrenceCount: 5,
        diffSummaryText:
          ' 16 files changed, 220 insertions(+), 70 deletions(-)',
      });

      const result = await analyzePreparedRun(
        { repoRoot: tempRepo, runId: 'run_recovery' },
        {
          now: () => new Date('2026-04-11T08:20:00.000Z'),
          modelExecutor: async ({ routingDecision }) => {
            modelCalls += 1;

            if (routingDecision.selectedTier === 'full') {
              return {
                synthesis: synthesisFixture({
                  executiveBrief:
                    'Escalated synthesis is now implementation ready.',
                  semanticOutcome: 'ready_to_implement',
                  summary:
                    'The escalated pass resolved the remaining uncertainty.',
                  claims: [
                    {
                      id: 'claim_final',
                      package: 'zod',
                      statement: 'The upgrade is ready to implement.',
                      confidence: 0.93,
                      bucket: 'SUPPORTED',
                      rationale:
                        'Escalated synthesis resolved the uncertainty.',
                      evidenceRefs: [
                        {
                          artifactFamily: 'diff',
                          package: 'zod',
                          locator: 'diff:zod',
                        },
                      ],
                    },
                  ],
                  implementationChecklist: [
                    {
                      id: 'apply_upgrade',
                      package: 'zod',
                      targetFile: '/repo/src/example.ts',
                      whyAffected: 'The runtime import path must be validated.',
                      currentPattern: "import { z } from 'zod';",
                      targetPattern: "import { z } from 'zod';",
                      changeIntent: 'verify_only',
                      confidence: 0.9,
                      evidenceRefs: [
                        {
                          artifactFamily: 'diff',
                          package: 'zod',
                          locator: 'diff:zod',
                        },
                      ],
                      validationSteps: ['Run bun run test.'],
                    },
                  ],
                }),
                modelUsed: 'gpt-5.4',
              };
            }

            return {
              synthesis: synthesisFixture(),
              modelUsed: 'gpt-5.4-mini',
            };
          },
        },
      );

      expect(modelCalls).toBe(2);
      expect(result.manifest.routingDecision.selectedTier).toBe('full');
      expect(result.manifest.outcomeClass).toBe('ready_to_implement');
      expect(result.manifest.recovery).toHaveLength(2);
      expect(result.manifest.recovery[0]?.status).toBe('attempted');
      expect(result.manifest.recovery[1]?.status).toBe('succeeded');
    } finally {
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  test('does not auto-escalate low-risk triage runs that remain review required', async () => {
    const tempRepo = await makeTempRepo();
    let modelCalls = 0;

    try {
      await writePrepFixture(tempRepo, 'run_triage_review', {
        mode: 'triage',
        targetVersion: '4.4.0',
        occurrenceCount: 1,
        diffSummaryText: ' 1 file changed, 2 insertions(+), 1 deletion(-)',
      });

      const result = await analyzePreparedRun(
        { repoRoot: tempRepo, runId: 'run_triage_review' },
        {
          now: () => new Date('2026-04-11T08:22:00.000Z'),
          modelExecutor: async ({ routingDecision }) => {
            modelCalls += 1;

            expect(routingDecision.selectedTier).toBe('nano');

            return {
              synthesis: synthesisFixture(),
              modelUsed: 'gpt-5.4-nano',
            };
          },
        },
      );

      expect(modelCalls).toBe(1);
      expect(result.manifest.routingDecision.selectedTier).toBe('nano');
      expect(result.manifest.recovery).toHaveLength(0);
      expect(result.manifest.outcomeClass).toBe('review_required');
    } finally {
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  test('does not auto-escalate low-risk implementation runs below recoveryEscalationMin', async () => {
    const tempRepo = await makeTempRepo();
    let modelCalls = 0;

    try {
      await writePrepFixture(tempRepo, 'run_low_risk_impl_review', {
        mode: 'implementation',
        targetVersion: '4.4.0',
        occurrenceCount: 1,
        diffSummaryText: ' 1 file changed, 2 insertions(+), 1 deletion(-)',
      });

      const result = await analyzePreparedRun(
        { repoRoot: tempRepo, runId: 'run_low_risk_impl_review' },
        {
          now: () => new Date('2026-04-11T08:22:30.000Z'),
          modelExecutor: async ({ routingDecision }) => {
            modelCalls += 1;

            expect(routingDecision.selectedTier).toBe('mini');

            return {
              synthesis: synthesisFixture(),
              modelUsed: 'gpt-5.4-mini',
            };
          },
        },
      );

      expect(modelCalls).toBe(1);
      expect(result.manifest.routingDecision.selectedTier).toBe('mini');
      expect(result.manifest.routingDecision.escalationScore).toBeLessThan(
        result.manifest.routingDecision.thresholds.recoveryEscalationMin,
      );
      expect(result.manifest.recovery).toHaveLength(0);
      expect(result.manifest.outcomeClass).toBe('review_required');
    } finally {
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  test('marks escalation as skipped when the rerun does not resolve uncertainty', async () => {
    const tempRepo = await makeTempRepo();
    let modelCalls = 0;

    try {
      await writePrepFixture(tempRepo, 'run_recovery_unresolved', {
        mode: 'implementation',
        targetVersion: '5.0.0',
        occurrenceCount: 5,
        diffSummaryText:
          ' 16 files changed, 220 insertions(+), 70 deletions(-)',
      });

      const result = await analyzePreparedRun(
        { repoRoot: tempRepo, runId: 'run_recovery_unresolved' },
        {
          now: () => new Date('2026-04-11T08:23:00.000Z'),
          modelExecutor: async ({ routingDecision }) => {
            modelCalls += 1;

            return {
              synthesis:
                routingDecision.selectedTier === 'full'
                  ? synthesisFixture({
                      executiveBrief:
                        'Escalated synthesis still requires manual review.',
                      summary:
                        'The escalated pass did not eliminate the remaining uncertainty.',
                    })
                  : synthesisFixture(),
              modelUsed:
                routingDecision.selectedTier === 'full'
                  ? 'gpt-5.4'
                  : 'gpt-5.4-mini',
            };
          },
        },
      );

      expect(modelCalls).toBe(2);
      expect(result.manifest.routingDecision.selectedTier).toBe('full');
      expect(result.manifest.outcomeClass).toBe('review_required');
      expect(result.manifest.recovery).toHaveLength(2);
      expect(result.manifest.recovery[0]?.status).toBe('attempted');
      expect(result.manifest.recovery[1]?.status).toBe('skipped');
      expect(result.manifest.recovery[1]?.notes).toContain(
        'final outcome remained review_required after escalation',
      );
    } finally {
      await rm(tempRepo, { recursive: true, force: true });
    }
  });

  for (const semanticOutcome of [
    'blocked',
    'degraded_reference_only',
  ] as const) {
    test(`does not auto-escalate implementation runs that already returned ${semanticOutcome}`, async () => {
      const tempRepo = await makeTempRepo();
      let modelCalls = 0;

      try {
        await writePrepFixture(
          tempRepo,
          `run_stop_outcome_${semanticOutcome}`,
          {
            mode: 'implementation',
            targetVersion: '5.0.0',
            occurrenceCount: 5,
            diffSummaryText:
              ' 16 files changed, 220 insertions(+), 70 deletions(-)',
          },
        );

        const result = await analyzePreparedRun(
          {
            repoRoot: tempRepo,
            runId: `run_stop_outcome_${semanticOutcome}`,
          },
          {
            now: () => new Date('2026-04-11T08:24:00.000Z'),
            modelExecutor: async ({ routingDecision }) => {
              modelCalls += 1;

              expect(routingDecision.selectedTier).toBe('mini');

              return {
                synthesis: synthesisFixture({
                  semanticOutcome,
                  executiveBrief: `Initial synthesis returned ${semanticOutcome}.`,
                  summary: `Initial synthesis returned ${semanticOutcome}.`,
                }),
                modelUsed: 'gpt-5.4-mini',
              };
            },
          },
        );

        expect(modelCalls).toBe(1);
        expect(result.manifest.routingDecision.selectedTier).toBe('mini');
        expect(result.manifest.recovery).toHaveLength(0);
        expect(result.manifest.outcomeClass).toBe(semanticOutcome);
      } finally {
        await rm(tempRepo, { recursive: true, force: true });
      }
    });
  }

  test('writes a schema-valid result bundle', async () => {
    const tempRepo = await makeTempRepo();

    try {
      await writePrepFixture(tempRepo, 'run_valid', {
        mode: 'research',
        targetVersion: '4.4.0',
      });

      const result = await analyzePreparedRun(
        { repoRoot: tempRepo, runId: 'run_valid' },
        {
          now: () => new Date('2026-04-11T08:25:00.000Z'),
          modelExecutor: async () => ({
            synthesis: synthesisFixture({
              openQuestions: [
                {
                  id: 'question_runtime',
                  package: 'zod',
                  question:
                    'Should one runtime validation path be inspected manually?',
                  whyOpen:
                    'The prep bundle does not include runtime execution evidence.',
                },
              ],
            }),
            modelUsed: 'gpt-5.4-mini',
          }),
        },
      );

      expect(
        resultManifestSchema.parse(
          JSON.parse(await Bun.file(result.manifestPath).text()) as unknown,
        ).outcomeClass,
      ).toBe('review_required');
      expect(
        decisionReportSchema.parse(
          JSON.parse(
            await Bun.file(result.manifest.resultFiles.decisionReport).text(),
          ) as unknown,
        ).summary,
      ).toContain('straightforward');
      expect(
        evidenceMapSchema.parse(
          JSON.parse(
            await Bun.file(result.manifest.resultFiles.evidenceMap).text(),
          ) as unknown,
        ).claims,
      ).toHaveLength(2);
      expect(
        implementationChecklistSchema.parse(
          JSON.parse(
            await Bun.file(
              result.manifest.resultFiles.implementationChecklist,
            ).text(),
          ) as unknown,
        ).items,
      ).toHaveLength(1);
      expect(
        validationChecklistSchema.parse(
          JSON.parse(
            await Bun.file(
              result.manifest.resultFiles.validationChecklist,
            ).text(),
          ) as unknown,
        ).items,
      ).toHaveLength(1);
      const openQuestionsPath = result.manifest.resultFiles.openQuestions;

      expect(openQuestionsPath).toBeDefined();
      if (openQuestionsPath === undefined) {
        throw new Error('openQuestionsPath should be defined');
      }
      const openQuestionsFile = openQuestionsPath;
      expect(
        openQuestionsSchema.parse(
          JSON.parse(await Bun.file(openQuestionsFile).text()) as unknown,
        ).questions,
      ).toHaveLength(1);

      const rerunResult = await analyzePreparedRun(
        { repoRoot: tempRepo, runId: 'run_valid' },
        {
          now: () => new Date('2026-04-11T08:26:00.000Z'),
          modelExecutor: async () => ({
            synthesis: synthesisFixture(),
            modelUsed: 'gpt-5.4-mini',
          }),
        },
      );

      expect(rerunResult.manifest.resultFiles.openQuestions).toBeUndefined();
      expect(await Bun.file(openQuestionsFile).exists()).toBe(false);
    } finally {
      await rm(tempRepo, { recursive: true, force: true });
    }
  });
});

describe('analysis prompt example', () => {
  test('stays schema-valid for implementation-driving output', () => {
    expect(analysisSynthesisSchema.parse(analysisPromptExample)).toEqual(
      analysisPromptExample,
    );
    expect(
      analysisPromptExample.implementationChecklist[0]?.evidenceRefs,
    ).toHaveLength(1);
  });
});

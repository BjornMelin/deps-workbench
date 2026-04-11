import { afterEach, describe, expect, mock, test } from 'bun:test';

import type { AnalysisModelInput } from '../src/core/models/openai-analysis';
import { analysisSynthesisSchema } from '../src/schemas';

const structuredSynthesis = analysisSynthesisSchema.parse({
  executiveBrief: 'Structured synthesis is ready for use.',
  semanticOutcome: 'review_required',
  summary: 'The agent returned schema-validated output.',
  topRiskSignals: ['typed_output'],
  claims: [
    {
      id: 'claim_structured',
      package: 'zod',
      statement: 'The agent output stayed structured.',
      confidence: 0.91,
      bucket: 'SUPPORTED',
      rationale: 'The SDK parsed the output through the configured schema.',
      evidenceRefs: [
        {
          artifactFamily: 'docs',
          package: 'zod',
          locator: 'docs:zod',
        },
      ],
    },
  ],
  implementationChecklist: [
    {
      id: 'verify_output_type',
      package: 'zod',
      targetFile: '/repo/src/example.ts',
      whyAffected: 'The structured analysis result drives implementation work.',
      currentPattern: 'plain-text finalOutput parsing',
      targetPattern: 'SDK-managed structured output',
      changeIntent: 'replace',
      confidence: 0.9,
      evidenceRefs: [
        {
          artifactFamily: 'diff',
          package: 'zod',
          locator: 'diff:zod',
        },
      ],
      validationSteps: ['Run bun test.'],
    },
  ],
  validationChecklist: [
    {
      id: 'run_unit_tests',
      package: 'zod',
      description: 'Run the analysis unit tests.',
      command: 'bun test',
      rationale: 'Confirms typed output wiring remains intact.',
      required: true,
      evidenceRefs: [],
    },
  ],
  openQuestions: [],
});

function analysisInput(): AnalysisModelInput {
  return {
    prepBundle: {
      runDirectory: '/repo/.local/runs/run_123',
      manifestPath: '/repo/.local/runs/run_123/prep/manifest.json',
      manifest: {
        mode: 'implementation',
        request: {
          packages: ['zod'],
          targetVersion: '4.4.0',
        },
      },
      meta: {
        repo: {
          root: '/repo',
          packageManager: 'bun@1.3.12',
          hasWorkspaces: true,
          workspaceCount: 1,
          packageJsonCount: 1,
          lockfilePresent: true,
        },
        packages: [],
      },
      docs: { packages: [] },
      releases: { packages: [] },
      sourcePaths: { packages: [] },
      diff: { packages: [] },
      usage: { packages: [] },
      signals: { packages: [] },
    } as unknown as AnalysisModelInput['prepBundle'],
    routingDecision: {
      selectedTier: 'mini',
      selectedModel: 'gpt-5.4-mini',
      escalationScore: 34,
      thresholds: {
        triageNanoMax: 34,
        fullEscalationMin: 72,
        recoveryEscalationMin: 58,
      },
      factors: [],
    } as AnalysisModelInput['routingDecision'],
    structuralAssessment: {
      findings: [],
      topRiskSignals: [],
      canSynthesize: true,
      readyForImplementation: false,
      outcomeClass: null,
      primaryAction: null,
      stopConditions: [],
      fallbackClaims: [],
    } as unknown as AnalysisModelInput['structuralAssessment'],
  };
}

afterEach(() => {
  mock.restore();
  delete process.env.OPENAI_API_KEY;
});

describe('runOpenAIAnalysis', () => {
  test('configures schema-typed output on the agent', async () => {
    process.env.OPENAI_API_KEY = 'test-key';

    const captured = {
      agentConfig: undefined as Record<string, unknown> | undefined,
      prompt: undefined as string | undefined,
    };

    class MockAgent {
      constructor(config: Record<string, unknown>) {
        captured.agentConfig = config;
      }
    }

    mock.module('@openai/agents', () => ({
      Agent: MockAgent,
      run: async (_agent: unknown, prompt: string) => {
        captured.prompt = prompt;

        return {
          finalOutput: structuredSynthesis,
        };
      },
    }));

    const { runOpenAIAnalysis } = await import(
      '../src/core/models/openai-analysis'
    );
    const result = await runOpenAIAnalysis(analysisInput());

    expect(captured.agentConfig?.outputType).toBe(analysisSynthesisSchema);
    expect(captured.prompt).toContain('Return one strict JSON object only.');
    expect(result.synthesis).toEqual(structuredSynthesis);
  });
});

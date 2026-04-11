import { Agent, run } from '@openai/agents';

import {
  type AnalysisSynthesis,
  analysisSynthesisSchema,
  type RoutingDecision,
} from '../../schemas';
import type { StructuralAssessment } from '../runtime/eligibility';
import type { LoadedPrepBundle } from '../runtime/intake';

export type AnalysisModelInput = {
  prepBundle: LoadedPrepBundle;
  routingDecision: RoutingDecision;
  structuralAssessment: StructuralAssessment;
};

export type AnalysisModelExecutor = (input: AnalysisModelInput) => Promise<{
  synthesis: AnalysisSynthesis;
  modelUsed: string;
}>;

export const analysisPromptExample = analysisSynthesisSchema.parse({
  executiveBrief: 'short markdown-safe summary string',
  semanticOutcome: 'review_required',
  summary: 'concise synthesis summary',
  topRiskSignals: ['signal_name'],
  claims: [
    {
      id: 'claim_id',
      package: 'package-name',
      statement: 'claim text',
      confidence: 0.86,
      bucket: 'SUPPORTED',
      rationale: 'why this claim is believed',
      evidenceRefs: [
        {
          artifactFamily: 'docs',
          package: 'package-name',
          locator: 'docs:package-name',
          excerpt: 'short excerpt',
        },
      ],
    },
  ],
  implementationChecklist: [
    {
      id: 'item_id',
      package: 'package-name',
      targetFile: '/absolute/or/pattern/path',
      whyAffected: 'why file is impacted',
      currentPattern: 'current symbol/import/config pattern',
      targetPattern: 'recommended target pattern',
      changeIntent: 'replace',
      confidence: 0.9,
      evidenceRefs: [
        {
          artifactFamily: 'usage',
          package: 'package-name',
          locator: 'usage:package-name',
        },
      ],
      validationSteps: ['validation step'],
    },
  ],
  validationChecklist: [
    {
      id: 'validation_id',
      package: 'package-name',
      description: 'validation to run',
      command: 'optional command',
      rationale: 'why',
      required: true,
      evidenceRefs: [
        {
          artifactFamily: 'diff',
          package: 'package-name',
          locator: 'diff:package-name',
        },
      ],
    },
  ],
  openQuestions: [
    {
      id: 'question_id',
      package: 'package-name',
      question: 'open question',
      whyOpen: 'why unresolved',
    },
  ],
  recommendedNextMode: 'research',
  promotionReason: 'why another mode is recommended',
  promotionConfidence: 0.5,
});

export function buildPrompt(input: AnalysisModelInput): string {
  const payload = {
    mode: input.prepBundle.manifest.mode,
    request: input.prepBundle.manifest.request,
    repo: input.prepBundle.meta.repo,
    packages: input.prepBundle.meta.packages,
    docs: input.prepBundle.docs.packages,
    releases: input.prepBundle.releases.packages,
    sourcePaths: input.prepBundle.sourcePaths.packages,
    diff: input.prepBundle.diff.packages,
    usage: input.prepBundle.usage.packages,
    signals: input.prepBundle.signals.packages,
    structuralFindings: input.structuralAssessment.findings,
    topRiskSignals: input.structuralAssessment.topRiskSignals,
  };

  return [
    'You are deps-workbench analysis runtime.',
    'Return one strict JSON object only.',
    'Do not use markdown fences.',
    'Produce implementation-driving output with explicit UNVERIFIED claims when certainty is limited.',
    'Use file-targeted checklist items, not raw patches.',
    'JSON shape:',
    JSON.stringify(analysisPromptExample, null, 2),
    'Prep bundle summary:',
    JSON.stringify(payload, null, 2),
  ].join('\n\n');
}

function mapReasoningEffort(
  tier: RoutingDecision['selectedTier'],
): 'low' | 'medium' | 'high' {
  if (tier === 'full') {
    return 'high';
  }
  if (tier === 'mini') {
    return 'medium';
  }
  return 'low';
}

export const runOpenAIAnalysis: AnalysisModelExecutor = async (input) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is required for deps-workbench analyze in Phase 04',
    );
  }

  const agent = new Agent({
    name: 'deps-workbench-analysis',
    instructions:
      'You synthesize dependency-upgrade prep bundles into machine-usable implementation plans.',
    model: input.routingDecision.selectedModel,
    outputType: analysisSynthesisSchema,
    modelSettings: {
      reasoning: {
        effort: mapReasoningEffort(input.routingDecision.selectedTier),
      },
      text: { verbosity: 'low' },
    },
  });

  const result = await run(agent, buildPrompt(input));
  const synthesis = result.finalOutput;

  if (synthesis === undefined) {
    throw new Error('OpenAI analyze returned no final structured output');
  }

  return {
    synthesis,
    modelUsed: input.routingDecision.selectedModel,
  };
};

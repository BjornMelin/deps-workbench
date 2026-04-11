/**
 * OpenAI Agents-backed analysis model executor for deps-workbench.
 *
 * @see https://openai.github.io/openai-agents-js/
 */
import { Agent, run } from '@openai/agents';

import {
  type AnalysisSynthesis,
  analysisSynthesisSchema,
  type RoutingDecision,
} from '../../schemas';
import type { StructuralAssessment } from '../runtime/eligibility';
import type { LoadedPrepBundle } from '../runtime/intake';

/** Structured input handed to the analysis model executor. */
export type AnalysisModelInput = {
  prepBundle: LoadedPrepBundle;
  routingDecision: RoutingDecision;
  structuralAssessment: StructuralAssessment;
};

/** Analysis executor contract used by the runtime. */
export type AnalysisModelExecutor = (input: AnalysisModelInput) => Promise<{
  synthesis: AnalysisSynthesis;
  modelUsed: string;
}>;

/** Schema-valid prompt example used to pin the model output shape. */
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

/**
 * Builds the instruction prompt and prep-bundle summary for OpenAI synthesis.
 *
 * @param input - Structured runtime input, routing decision, and prep bundle.
 * @returns Prompt text that instructs the model to return strict JSON only.
 */
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

/**
 * Executes OpenAI Agents synthesis against the prepared bundle and routing decision.
 *
 * @param input - Prepared bundle, routing decision, and structural assessment.
 * @returns Structured synthesis and the model identifier that produced it.
 * @throws {Error} When OPENAI_API_KEY is missing and synthesis cannot start.
 * @throws {Error} When the Agents SDK rejects structured output or returns no final structured output.
 */
export const runOpenAIAnalysis: AnalysisModelExecutor = async (input) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for deps-workbench analyze');
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

  const result = await (async () => {
    try {
      return await run(agent, buildPrompt(input));
    } catch (error) {
      if (isModelBehaviorError(error)) {
        throw new Error(
          [
            'OpenAI analyze failed structured-output parsing',
            `model=${input.routingDecision.selectedModel}`,
            formatModelBehaviorError(error),
          ].join(' | '),
          { cause: error },
        );
      }

      throw error;
    }
  })();
  const synthesis = result.finalOutput;

  if (synthesis === undefined) {
    throw new Error(
      `OpenAI analyze returned no final structured output for model ${input.routingDecision.selectedModel}`,
    );
  }

  return {
    synthesis,
    modelUsed: input.routingDecision.selectedModel,
  };
};

type ModelBehaviorErrorLike = Error & {
  details?: unknown;
};

function isModelBehaviorError(error: unknown): error is ModelBehaviorErrorLike {
  return error instanceof Error && error.name === 'ModelBehaviorError';
}

function formatModelBehaviorError(error: ModelBehaviorErrorLike): string {
  if (error.details === undefined) {
    return error.message;
  }

  if (typeof error.details === 'string') {
    return `${error.message} | details=${error.details}`;
  }

  try {
    return `${error.message} | details=${JSON.stringify(error.details)}`;
  } catch {
    return `${error.message} | details=[unserializable]`;
  }
}

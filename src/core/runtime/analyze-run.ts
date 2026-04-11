import {
  type AnalysisSynthesis,
  analysisSynthesisSchema,
  type Policy,
  type PrimaryAction,
  type ResultManifest,
} from '../../schemas';
import {
  type AnalysisModelExecutor,
  runOpenAIAnalysis,
} from '../models/openai-analysis';
import { loadCheckedInPolicy } from '../policy/load-policy';
import { writeResultBundle } from '../results/write-result-bundle';
import { evaluateStructuralEligibility } from './eligibility';
import { loadPrepBundleFromRunId } from './intake';
import {
  buildRecoveryRecord,
  shouldAttemptEscalationRecovery,
} from './recovery';
import { buildRoutingDecision } from './routing';

/** CLI/runtime options for analyzing one prepared run. */
export type AnalyzeRunOptions = {
  repoRoot?: string;
  runId: string;
};

/** Optional dependency overrides used by tests and non-default callers. */
export type AnalyzeRunDependencies = {
  now?: () => Date;
  loadPolicy?: (repoRoot: string) => Promise<Policy>;
  modelExecutor?: AnalysisModelExecutor;
};

/** Parsed result bundle returned by the analysis runtime. */
export type AnalyzeRunResult = Awaited<ReturnType<typeof writeResultBundle>>;

function blockedSynthesis(input: {
  claims: AnalysisSynthesis['claims'];
  summary: string;
  topRiskSignals: string[];
  validationDescription?: string;
  validationRationale?: string;
}): AnalysisSynthesis {
  return analysisSynthesisSchema.parse({
    executiveBrief: input.summary,
    semanticOutcome: 'blocked',
    summary: input.summary,
    topRiskSignals: input.topRiskSignals,
    claims: input.claims,
    implementationChecklist: [],
    validationChecklist: [
      {
        id: 'refresh_missing_evidence',
        description:
          input.validationDescription ??
          'Refresh the missing prep evidence before re-running analyze',
        rationale:
          input.validationRationale ??
          'Structural eligibility checks blocked synthesis.',
        required: true,
        evidenceRefs: [],
      },
    ],
    openQuestions: [],
  });
}

function resolvePrimaryAction(
  outcomeClass: ResultManifest['outcomeClass'],
): PrimaryAction {
  if (outcomeClass === 'blocked') {
    return 'stop_blocked';
  }
  if (outcomeClass === 'ready_to_implement') {
    return 'implement_now';
  }
  if (outcomeClass === 'degraded_reference_only') {
    return 'refresh_missing_evidence';
  }
  return 'review_key_claims';
}

function finalizeOutcomeClass(input: {
  structuralReady: boolean;
  structuralBlocked: boolean;
  synthesis: AnalysisSynthesis;
}): ResultManifest['outcomeClass'] {
  if (input.structuralBlocked) {
    return 'blocked';
  }

  if (input.synthesis.semanticOutcome === 'blocked') {
    return 'blocked';
  }

  if (
    input.structuralReady &&
    input.synthesis.semanticOutcome === 'ready_to_implement'
  ) {
    return 'ready_to_implement';
  }

  if (input.synthesis.semanticOutcome === 'degraded_reference_only') {
    return 'degraded_reference_only';
  }

  return 'review_required';
}

function didEscalationResolveUncertainty(input: {
  before: ResultManifest['outcomeClass'];
  after: ResultManifest['outcomeClass'];
}): boolean {
  return (
    input.before !== 'ready_to_implement' &&
    input.after === 'ready_to_implement'
  );
}

function renderModelExecutorFailureMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.length > 200 ? `${message.slice(0, 197)}...` : message;
}

async function writeBlockedModelFailureResult(input: {
  prepBundle: Awaited<ReturnType<typeof loadPrepBundleFromRunId>>;
  routingDecision: ReturnType<typeof buildRoutingDecision>;
  recovery: ResultManifest['recovery'];
  structuralAssessment: ReturnType<typeof evaluateStructuralEligibility>;
  generatedAt: string;
  error: unknown;
}): Promise<AnalyzeRunResult> {
  const failureMessage = renderModelExecutorFailureMessage(input.error);
  const synthesis = blockedSynthesis({
    claims: [
      {
        id: 'model_synthesis_failed',
        package:
          input.structuralAssessment.findings[0]?.package ??
          input.prepBundle.manifest.request.packages[0] ??
          'analysis',
        statement:
          'model synthesis failed before a structured analysis result was produced',
        confidence: 0.1,
        bucket: 'UNVERIFIED',
        rationale: `Model executor failed with: ${failureMessage}`,
        evidenceRefs: [
          {
            artifactFamily: 'meta',
            locator: 'meta:model_executor_failure',
          },
        ],
      },
    ],
    summary: `Analysis blocked during synthesis: ${failureMessage}`,
    topRiskSignals: input.structuralAssessment.topRiskSignals,
    validationDescription:
      'Inspect the synthesis failure and rerun analyze after the runtime issue is fixed',
    validationRationale:
      'The model executor failed before producing structured output.',
  });

  return writeResultBundle({
    prepBundle: input.prepBundle,
    synthesis,
    outcomeClass: 'blocked',
    primaryAction: 'stop_blocked',
    routingDecision: input.routingDecision,
    recovery: input.recovery,
    modelUsed: input.routingDecision.selectedModel,
    generatedAt: input.generatedAt,
    structuralAssessment: input.structuralAssessment,
  });
}

/**
 * Loads a prepared bundle, synthesizes analysis, and writes the result bundle.
 *
 * @param options - Repository root and prep run id to analyze.
 * @param dependencies - Optional clock, policy loader, and model executor overrides.
 * @returns Parsed result bundle metadata after the analysis artifacts are written.
 * @see https://openai.github.io/openai-agents-js/
 */
export async function analyzePreparedRun(
  options: AnalyzeRunOptions,
  dependencies: AnalyzeRunDependencies = {},
): Promise<AnalyzeRunResult> {
  const now = dependencies.now ?? (() => new Date());
  const repoRoot = options.repoRoot ?? process.cwd();
  const loadPolicy = dependencies.loadPolicy ?? loadCheckedInPolicy;
  const prepBundlePromise = loadPrepBundleFromRunId(repoRoot, options.runId);
  const policyPromise = loadPolicy(repoRoot);
  const [prepBundle, policy] = await Promise.all([
    prepBundlePromise,
    policyPromise,
  ]);
  const structuralAssessment = evaluateStructuralEligibility(
    prepBundle,
    prepBundle.manifest.mode,
  );
  const routingDecision = buildRoutingDecision({ prepBundle, policy });
  const modelExecutor = dependencies.modelExecutor ?? runOpenAIAnalysis;
  const recovery = [] as ResultManifest['recovery'];
  const blockedPackageName =
    structuralAssessment.findings[0]?.package ??
    prepBundle.manifest.request.packages[0] ??
    'analysis';
  type ModelExecutionResult = Awaited<ReturnType<typeof modelExecutor>>;

  if (!structuralAssessment.canSynthesize) {
    const synthesis = blockedSynthesis({
      claims:
        structuralAssessment.fallbackClaims.length > 0
          ? structuralAssessment.fallbackClaims
          : [
              {
                id: 'blocked_analysis',
                package: blockedPackageName,
                statement:
                  'analysis is blocked by missing core evidence pillars',
                confidence: 0.1,
                bucket: 'UNVERIFIED',
                rationale:
                  'Generated without model synthesis because the prep bundle is structurally incomplete.',
                evidenceRefs: [
                  {
                    artifactFamily: 'meta',
                    locator: 'meta:blocker',
                  },
                ],
              },
            ],
      summary:
        structuralAssessment.stopConditions[0] ??
        'Analysis blocked before synthesis.',
      topRiskSignals: structuralAssessment.topRiskSignals,
    });

    return writeResultBundle({
      prepBundle,
      synthesis,
      outcomeClass: 'blocked',
      primaryAction: 'stop_blocked',
      routingDecision,
      recovery,
      generatedAt: now().toISOString(),
      structuralAssessment,
    });
  }

  let activeRoutingDecision = routingDecision;
  let synthesisResult: ModelExecutionResult;

  try {
    synthesisResult = await modelExecutor({
      prepBundle,
      routingDecision: activeRoutingDecision,
      structuralAssessment,
    });
  } catch (error) {
    return writeBlockedModelFailureResult({
      prepBundle,
      routingDecision: activeRoutingDecision,
      recovery,
      structuralAssessment,
      generatedAt: now().toISOString(),
      error,
    });
  }

  if (
    shouldAttemptEscalationRecovery({
      mode: prepBundle.manifest.mode,
      routingDecision: activeRoutingDecision,
      synthesis: synthesisResult.synthesis,
      policy,
      recoveryCount: recovery.length,
    })
  ) {
    const outcomeBeforeEscalation = finalizeOutcomeClass({
      structuralReady: structuralAssessment.readyForImplementation,
      structuralBlocked: false,
      synthesis: synthesisResult.synthesis,
    });
    const escalatedRoutingDecision = {
      ...activeRoutingDecision,
      selectedTier: 'full' as const,
      selectedModel: policy.modelRouting.tiers.full,
    };
    recovery.push(
      buildRecoveryRecord({
        status: 'attempted',
        trigger:
          'initial synthesis remained uncertain enough to justify a single escalation retry',
        fromTier: activeRoutingDecision.selectedTier,
        toTier: 'full',
      }),
    );
    try {
      synthesisResult = await modelExecutor({
        prepBundle,
        routingDecision: escalatedRoutingDecision,
        structuralAssessment,
      });
    } catch (error) {
      return writeBlockedModelFailureResult({
        prepBundle,
        routingDecision: escalatedRoutingDecision,
        recovery,
        structuralAssessment,
        generatedAt: now().toISOString(),
        error,
      });
    }
    const outcomeAfterEscalation = finalizeOutcomeClass({
      structuralReady: structuralAssessment.readyForImplementation,
      structuralBlocked: false,
      synthesis: synthesisResult.synthesis,
    });
    const escalationResolvedUncertainty = didEscalationResolveUncertainty({
      before: outcomeBeforeEscalation,
      after: outcomeAfterEscalation,
    });
    recovery.push(
      buildRecoveryRecord({
        status: escalationResolvedUncertainty ? 'succeeded' : 'skipped',
        trigger: escalationResolvedUncertainty
          ? 're-ran synthesis at the full tier and resolved the remaining uncertainty'
          : 're-ran synthesis at the full tier but the result still requires operator review',
        fromTier: activeRoutingDecision.selectedTier,
        toTier: 'full',
        notes:
          outcomeAfterEscalation === 'ready_to_implement'
            ? []
            : [
                `final outcome remained ${outcomeAfterEscalation} after escalation`,
              ],
      }),
    );
    activeRoutingDecision = escalatedRoutingDecision;
  }

  const outcomeClass = finalizeOutcomeClass({
    structuralReady: structuralAssessment.readyForImplementation,
    structuralBlocked: false,
    synthesis: synthesisResult.synthesis,
  });
  const primaryAction = resolvePrimaryAction(outcomeClass);

  return writeResultBundle({
    prepBundle,
    synthesis: synthesisResult.synthesis,
    outcomeClass,
    primaryAction,
    routingDecision: activeRoutingDecision,
    recovery,
    modelUsed: synthesisResult.modelUsed,
    generatedAt: now().toISOString(),
    structuralAssessment,
  });
}

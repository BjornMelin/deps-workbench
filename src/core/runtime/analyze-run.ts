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

export type AnalyzeRunOptions = {
  repoRoot?: string;
  runId: string;
};

export type AnalyzeRunDependencies = {
  now?: () => Date;
  loadPolicy?: (repoRoot: string) => Promise<Policy>;
  modelExecutor?: AnalysisModelExecutor;
};

export type AnalyzeRunResult = Awaited<ReturnType<typeof writeResultBundle>>;

function blockedSynthesis(input: {
  claims: AnalysisSynthesis['claims'];
  summary: string;
  topRiskSignals: string[];
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
          'Refresh the missing prep evidence before re-running analyze',
        rationale: 'Structural eligibility checks blocked synthesis.',
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

export async function analyzePreparedRun(
  options: AnalyzeRunOptions,
  dependencies: AnalyzeRunDependencies = {},
): Promise<AnalyzeRunResult> {
  const now = dependencies.now ?? (() => new Date());
  const prepBundle = await loadPrepBundleFromRunId(
    options.repoRoot ?? process.cwd(),
    options.runId,
  );
  const policy = await (dependencies.loadPolicy ?? loadCheckedInPolicy)(
    prepBundle.manifest.repoRoot,
  );
  const structuralAssessment = evaluateStructuralEligibility(
    prepBundle,
    prepBundle.manifest.mode,
  );
  const routingDecision = buildRoutingDecision({ prepBundle, policy });
  const modelExecutor = dependencies.modelExecutor ?? runOpenAIAnalysis;
  const recovery = [] as ResultManifest['recovery'];

  if (!structuralAssessment.canSynthesize) {
    const synthesis = blockedSynthesis({
      claims:
        structuralAssessment.fallbackClaims.length > 0
          ? structuralAssessment.fallbackClaims
          : [
              {
                id: 'blocked_analysis',
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
      modelUsed: routingDecision.selectedModel,
      generatedAt: now().toISOString(),
      structuralAssessment,
    });
  }

  let activeRoutingDecision = routingDecision;
  let synthesisResult = await modelExecutor({
    prepBundle,
    routingDecision: activeRoutingDecision,
    structuralAssessment,
  });

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
    synthesisResult = await modelExecutor({
      prepBundle,
      routingDecision: escalatedRoutingDecision,
      structuralAssessment,
    });
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

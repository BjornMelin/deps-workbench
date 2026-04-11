import type {
  AnalysisSynthesis,
  Mode,
  Policy,
  RecoveryRecord,
  RoutingDecision,
} from '../../schemas';

export function shouldAttemptEscalationRecovery(input: {
  mode: Mode;
  routingDecision: RoutingDecision;
  synthesis: AnalysisSynthesis;
  policy: Policy;
  recoveryCount: number;
}): boolean {
  if (input.recoveryCount >= input.policy.recovery.maxAutomaticHops) {
    return false;
  }

  if (
    !input.policy.recovery.allowedActions.includes('re_run_with_escalation')
  ) {
    return false;
  }

  if (input.routingDecision.selectedTier === 'full') {
    return false;
  }

  if (input.mode !== 'implementation') {
    return false;
  }

  const unverifiedCount = input.synthesis.claims.filter(
    (claim) => claim.bucket === 'UNVERIFIED',
  ).length;
  const reachedRecoveryEscalationMin =
    input.routingDecision.escalationScore >=
    input.policy.modelRouting.thresholds.recoveryEscalationMin;

  if (!reachedRecoveryEscalationMin) {
    return false;
  }

  if (
    input.synthesis.semanticOutcome === 'ready_to_implement' ||
    input.synthesis.semanticOutcome === 'blocked' ||
    input.synthesis.semanticOutcome === 'degraded_reference_only'
  ) {
    return false;
  }

  return (
    unverifiedCount >= 2 ||
    input.synthesis.semanticOutcome === 'review_required'
  );
}

export function buildRecoveryRecord(input: {
  status: RecoveryRecord['status'];
  trigger: string;
  fromTier: RoutingDecision['selectedTier'];
  toTier?: RoutingDecision['selectedTier'];
  notes?: string[];
}): RecoveryRecord {
  return {
    action: 're_run_with_escalation',
    status: input.status,
    trigger: input.trigger,
    fromTier: input.fromTier,
    toTier: input.toTier,
    notes: input.notes ?? [],
  };
}

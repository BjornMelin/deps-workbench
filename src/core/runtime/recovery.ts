import type {
  AnalysisSynthesis,
  Mode,
  Policy,
  RecoveryRecord,
  RoutingDecision,
} from '../../schemas';

/**
 * Determines whether the bounded escalation retry should be attempted.
 *
 * @param input - Mode, routing, synthesis, policy, and current recovery count.
 * @returns True when the run may benefit from one escalation hop.
 */
export function shouldAttemptEscalationRecovery(input: {
  mode: Mode;
  routingDecision: RoutingDecision;
  synthesis: AnalysisSynthesis;
  policy: Policy;
  recoveryCount: number;
}): boolean {
  const unverifiedClaimsEscalationThreshold = 2;

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
  // Two unverified claims is the smallest signal that uncertainty is broader
  // than a single local gap, so the bounded retry only triggers at that point.
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
    unverifiedCount >= unverifiedClaimsEscalationThreshold ||
    input.synthesis.semanticOutcome === 'review_required'
  );
}

/**
 * Builds a typed recovery record for the single bounded escalation hop.
 *
 * @param input - Recovery status, trigger, tier transition, and optional notes.
 * @returns A schema-compatible recovery record.
 */
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

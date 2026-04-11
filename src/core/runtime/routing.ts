import type { Policy, RoutingDecision } from '../../schemas';
import type { LoadedPrepBundle } from './intake';

type RoutingCategory =
  | 'upgradeSeverity'
  | 'evidenceConflict'
  | 'repoBlastRadius'
  | 'apiSurfaceMovement'
  | 'replacementOpportunity'
  | 'uncertainty'
  | 'coupling';

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseChangeMagnitude(summaryText: string | undefined): number {
  if (!summaryText) {
    return 25;
  }

  const filesMatch = summaryText.match(/(\d+)\s+files?\s+changed/i);
  const insertionsMatch = summaryText.match(/(\d+)\s+insertions?/i);
  const deletionsMatch = summaryText.match(/(\d+)\s+deletions?/i);

  const filesChanged = filesMatch ? Number(filesMatch[1]) : 0;
  const insertions = insertionsMatch ? Number(insertionsMatch[1]) : 0;
  const deletions = deletionsMatch ? Number(deletionsMatch[1]) : 0;

  return clampScore(filesChanged * 6 + (insertions + deletions) / 8);
}

function majorVersionScore(prepBundle: LoadedPrepBundle): number {
  const majors = prepBundle.sourcePaths.packages.map((entry) => {
    const current = Number(entry.current?.version?.split('.')[0] ?? '0');
    const target = Number(
      (
        entry.target?.version ?? prepBundle.manifest.request.targetVersion
      )?.split('.')[0] ?? '0',
    );

    if (target > current && current > 0) {
      return 100;
    }
    if (target === current && target > 0) {
      return 35;
    }
    return prepBundle.manifest.request.targetVersion ? 55 : 20;
  });

  return clampScore(
    majors.length > 0
      ? majors.reduce((sum, value) => sum + value, 0) / majors.length
      : 20,
  );
}

function evidenceConflictScore(prepBundle: LoadedPrepBundle): number {
  const degradedArtifacts = prepBundle.manifest.degradedArtifactFamilies.length;
  const warnSignals = prepBundle.signals.packages.flatMap((entry) =>
    entry.signals.filter((signal) => signal.severity !== 'info'),
  ).length;

  return clampScore(degradedArtifacts * 18 + warnSignals * 6);
}

function repoBlastRadiusScore(prepBundle: LoadedPrepBundle): number {
  const occurrenceCount = prepBundle.meta.packages.reduce(
    (sum, entry) => sum + entry.occurrences.length,
    0,
  );
  const workspaceCount = prepBundle.meta.repo.workspaceCount;

  return clampScore(occurrenceCount * 14 + workspaceCount * 8);
}

function apiSurfaceMovementScore(prepBundle: LoadedPrepBundle): number {
  return clampScore(
    prepBundle.diff.packages.reduce(
      (sum, entry) => sum + parseChangeMagnitude(entry.summaryText),
      0,
    ) / Math.max(1, prepBundle.diff.packages.length),
  );
}

function replacementOpportunityScore(prepBundle: LoadedPrepBundle): number {
  const whyHints = prepBundle.usage.packages.flatMap((entry) =>
    entry.whyText?.includes('deduped') ? [40] : [],
  );

  return clampScore(
    whyHints.length > 0
      ? whyHints.reduce((sum, value) => sum + value, 0) / whyHints.length
      : 15,
  );
}

function uncertaintyScore(prepBundle: LoadedPrepBundle): number {
  const degraded = prepBundle.manifest.degradedArtifactFamilies.length * 14;
  const unverifiedSignals = prepBundle.signals.packages.reduce(
    (sum, entry) =>
      sum +
      entry.signals.filter((signal) => signal.name.includes('incomplete'))
        .length *
        12,
    0,
  );

  return clampScore(degraded + unverifiedSignals);
}

function couplingScore(prepBundle: LoadedPrepBundle): number {
  const packageFields = prepBundle.meta.packages.reduce(
    (sum, entry) =>
      sum +
      entry.occurrences.filter((occurrence) =>
        ['peerDependencies', 'overrides', 'resolutions'].includes(
          occurrence.field,
        ),
      ).length *
        15,
    0,
  );

  return clampScore(packageFields + prepBundle.meta.repo.workspaceCount * 4);
}

export function buildRoutingDecision(input: {
  prepBundle: LoadedPrepBundle;
  policy: Policy;
}): RoutingDecision {
  const categoryScores: Record<RoutingCategory, number> = {
    upgradeSeverity: majorVersionScore(input.prepBundle),
    evidenceConflict: evidenceConflictScore(input.prepBundle),
    repoBlastRadius: repoBlastRadiusScore(input.prepBundle),
    apiSurfaceMovement: apiSurfaceMovementScore(input.prepBundle),
    replacementOpportunity: replacementOpportunityScore(input.prepBundle),
    uncertainty: uncertaintyScore(input.prepBundle),
    coupling: couplingScore(input.prepBundle),
  };

  const factors = (
    Object.entries(categoryScores) as Array<[RoutingCategory, number]>
  ).map(([category, rawScore]) => ({
    category,
    rawScore,
    weightedContribution:
      (rawScore * input.policy.modelRouting.weights[category]) / 100,
    rationale: `${category} scored ${rawScore} from prep bundle heuristics`,
  }));

  const escalationScore = clampScore(
    factors.reduce((sum, factor) => sum + factor.weightedContribution, 0),
  );

  const thresholds = input.policy.modelRouting.thresholds;
  const selectedTier =
    escalationScore >= thresholds.fullEscalationMin
      ? 'full'
      : input.prepBundle.manifest.mode === 'triage' &&
          escalationScore <= thresholds.triageNanoMax
        ? 'nano'
        : 'mini';

  return {
    selectedTier,
    selectedModel: input.policy.modelRouting.tiers[selectedTier],
    escalationScore,
    thresholds,
    factors,
  };
}

import type {
  Mode,
  OutcomeClass,
  PrimaryAction,
  ResultClaim,
} from '../../schemas';
import type { LoadedPrepBundle } from './intake';

/** Package-scoped structural blockers and degradations observed before synthesis. */
export type StructuralFinding = {
  package: string;
  blockers: string[];
  degradations: string[];
};

/**
 * Aggregate structural eligibility state used to gate synthesis and fallback claims.
 */
export type StructuralAssessment = {
  canSynthesize: boolean;
  readyForImplementation: boolean;
  outcomeClass: OutcomeClass | null;
  primaryAction: PrimaryAction | null;
  stopConditions: string[];
  findings: StructuralFinding[];
  fallbackClaims: ResultClaim[];
  topRiskSignals: string[];
};

function indexPackages<T extends { package: string }>(
  packages: T[],
): Map<string, T> {
  return new Map(packages.map((entry) => [entry.package, entry]));
}

function hasCollectedDocsOrReleases(
  docsByPackage: Map<string, { status: string }>,
  releasesByPackage: Map<string, { status: string }>,
  packageName: string,
): boolean {
  const docsEntry = docsByPackage.get(packageName);
  const releasesEntry = releasesByPackage.get(packageName);

  return (
    docsEntry?.status === 'collected' || releasesEntry?.status === 'collected'
  );
}

function buildFallbackClaim(
  packageName: string,
  kind: 'blocker' | 'degradation',
  detail: string,
): ResultClaim {
  return {
    id: `${packageName}_${kind}_${detail
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')}`,
    package: packageName,
    statement: detail,
    confidence: kind === 'blocker' ? 0.15 : 0.35,
    bucket: 'UNVERIFIED',
    rationale: 'Derived from structural eligibility checks before synthesis.',
    evidenceRefs: [
      {
        artifactFamily: 'meta',
        package: packageName,
        locator: `meta:${packageName}`,
      },
    ],
  };
}

function buildBundleFallbackClaim(detail: string): ResultClaim {
  return {
    id: `bundle_degradation_${detail
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')}`,
    statement: detail,
    confidence: 0.35,
    bucket: 'UNVERIFIED',
    rationale:
      'Derived from bundle-level structural eligibility checks before synthesis.',
    evidenceRefs: [
      {
        artifactFamily: 'meta',
        locator: 'meta:bundle',
      },
    ],
  };
}

/**
 * Evaluates structural eligibility for synthesis based on prep bundle completeness.
 *
 * @param prepBundle - Loaded prep bundle containing all artifact families.
 * @param mode - Operator mode that determines implementation gating behavior.
 * @returns Structural assessment with synthesis readiness, findings, and fallback claims.
 */
export function evaluateStructuralEligibility(
  prepBundle: LoadedPrepBundle,
  mode: Mode,
): StructuralAssessment {
  const metaByPackage = indexPackages(prepBundle.meta.packages);
  const docsByPackage = indexPackages(prepBundle.docs.packages);
  const releasesByPackage = indexPackages(prepBundle.releases.packages);
  const sourcePathsByPackage = indexPackages(prepBundle.sourcePaths.packages);
  const diffByPackage = indexPackages(prepBundle.diff.packages);
  const usageByPackage = indexPackages(prepBundle.usage.packages);
  const findings: StructuralFinding[] = [];
  const stopConditions: string[] = [];
  const fallbackClaims: ResultClaim[] = [];
  const bundleDegradationMessage =
    prepBundle.manifest.degradedArtifactFamilies.length > 0
      ? `prep bundle degraded families: ${prepBundle.manifest.degradedArtifactFamilies.join(
          ', ',
        )}`
      : null;

  for (const packageName of prepBundle.manifest.request.packages) {
    const metaEntry = metaByPackage.get(packageName);
    const sourcePathsEntry = sourcePathsByPackage.get(packageName);
    const usageEntry = usageByPackage.get(packageName);
    const diffEntry = diffByPackage.get(packageName);

    const blockers: string[] = [];
    const degradations: string[] = [];

    if (metaEntry === undefined) {
      blockers.push('dependency metadata is missing');
    }

    if (sourcePathsEntry?.current === undefined) {
      blockers.push('current source resolution is missing');
    }

    if (usageEntry?.status !== 'collected') {
      blockers.push('repo usage scan is missing');
    }

    if (
      !hasCollectedDocsOrReleases(docsByPackage, releasesByPackage, packageName)
    ) {
      blockers.push('authoritative docs or release metadata are missing');
    }

    if (diffEntry === undefined) {
      blockers.push('source diff artifact is missing');
    }

    if (mode === 'implementation') {
      if (
        sourcePathsEntry?.target === undefined &&
        prepBundle.manifest.request.targetVersion === undefined
      ) {
        blockers.push('target version or target source resolution is missing');
      }

      if (diffEntry?.status !== undefined && diffEntry.status !== 'collected') {
        degradations.push(
          diffEntry.error ??
            (diffEntry.status === 'skipped'
              ? 'source diff was skipped'
              : 'source diff is degraded'),
        );
      }
    } else if (prepBundle.manifest.request.targetVersion === undefined) {
      degradations.push('target version is unspecified');
    }

    findings.push({
      package: packageName,
      blockers,
      degradations,
    });

    for (const blocker of blockers) {
      stopConditions.push(`${packageName}: ${blocker}`);
      fallbackClaims.push(buildFallbackClaim(packageName, 'blocker', blocker));
    }
    for (const degradation of degradations) {
      fallbackClaims.push(
        buildFallbackClaim(packageName, 'degradation', degradation),
      );
    }
  }

  if (bundleDegradationMessage !== null) {
    fallbackClaims.push(buildBundleFallbackClaim(bundleDegradationMessage));
  }

  const blocked = findings.some((finding) => finding.blockers.length > 0);
  const degraded =
    bundleDegradationMessage !== null ||
    findings.some((finding) => finding.degradations.length > 0);
  const topRiskSignals = Array.from(
    new Set(
      prepBundle.signals.packages.flatMap((entry) =>
        entry.signals
          .filter((signal) => signal.severity !== 'info')
          .map((signal) => signal.name),
      ),
    ),
  );

  if (blocked) {
    return {
      canSynthesize: false,
      readyForImplementation: false,
      outcomeClass: 'blocked',
      primaryAction: 'stop_blocked',
      stopConditions,
      findings,
      fallbackClaims,
      topRiskSignals,
    };
  }

  if (mode === 'implementation' && degraded) {
    return {
      canSynthesize: true,
      readyForImplementation: false,
      outcomeClass: null,
      primaryAction: null,
      stopConditions,
      findings,
      fallbackClaims,
      topRiskSignals,
    };
  }

  return {
    canSynthesize: true,
    readyForImplementation: mode === 'implementation' && !degraded,
    outcomeClass: null,
    primaryAction: null,
    stopConditions,
    findings,
    fallbackClaims,
    topRiskSignals,
  };
}

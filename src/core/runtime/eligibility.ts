import type {
  Mode,
  OutcomeClass,
  PrimaryAction,
  ResultClaim,
} from '../../schemas';
import type { LoadedPrepBundle } from './intake';

export type StructuralFinding = {
  package: string;
  blockers: string[];
  degradations: string[];
};

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

function hasCollectedDocsOrReleases(
  prepBundle: LoadedPrepBundle,
  packageName: string,
): boolean {
  const docsEntry = prepBundle.docs.packages.find(
    (entry) => entry.package === packageName,
  );
  const releasesEntry = prepBundle.releases.packages.find(
    (entry) => entry.package === packageName,
  );

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

export function evaluateStructuralEligibility(
  prepBundle: LoadedPrepBundle,
  mode: Mode,
): StructuralAssessment {
  const findings: StructuralFinding[] = [];
  const stopConditions: string[] = [];
  const fallbackClaims: ResultClaim[] = [];

  for (const packageEntry of prepBundle.meta.packages) {
    const packageName = packageEntry.package;
    const sourcePathsEntry = prepBundle.sourcePaths.packages.find(
      (entry) => entry.package === packageName,
    );
    const usageEntry = prepBundle.usage.packages.find(
      (entry) => entry.package === packageName,
    );
    const diffEntry = prepBundle.diff.packages.find(
      (entry) => entry.package === packageName,
    );

    const blockers: string[] = [];
    const degradations: string[] = [];

    if (sourcePathsEntry?.current === undefined) {
      blockers.push('current source resolution is missing');
    }

    if (usageEntry?.status !== 'collected') {
      blockers.push('repo usage scan is missing');
    }

    if (!hasCollectedDocsOrReleases(prepBundle, packageName)) {
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

      if (diffEntry?.status === 'degraded') {
        degradations.push(diffEntry.error ?? 'source diff is degraded');
      }
    } else if (prepBundle.manifest.request.targetVersion === undefined) {
      degradations.push('target version is unspecified');
    }

    if (prepBundle.manifest.degradedArtifactFamilies.length > 0) {
      degradations.push(
        `prep bundle degraded families: ${prepBundle.manifest.degradedArtifactFamilies.join(
          ', ',
        )}`,
      );
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

  const blocked = findings.some((finding) => finding.blockers.length > 0);
  const degraded = findings.some((finding) => finding.degradations.length > 0);
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

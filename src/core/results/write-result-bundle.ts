import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import {
  type AnalysisSynthesis,
  decisionReportSchema,
  evidenceMapSchema,
  implementationChecklistSchema,
  openQuestionsSchema,
  type RecoveryRecord,
  type ResultManifest,
  type RoutingDecision,
  resultManifestSchema,
  validationChecklistSchema,
} from '../../schemas';
import type { StructuralAssessment } from '../runtime/eligibility';
import type { LoadedPrepBundle } from '../runtime/intake';
import { writeJsonFileAtomic } from '../storage/json';
import { resolveResultArtifactRoot } from '../storage/paths';

/** Structured input required to render the canonical result bundle. */
export type ResultBundleWriteInput = {
  prepBundle: LoadedPrepBundle;
  synthesis: AnalysisSynthesis;
  outcomeClass: ResultManifest['outcomeClass'];
  primaryAction: ResultManifest['primaryAction'];
  routingDecision: RoutingDecision;
  recovery: RecoveryRecord[];
  modelUsed?: string;
  generatedAt: string;
  structuralAssessment: StructuralAssessment;
};

/** Paths and manifest produced by a completed result bundle write. */
export type WrittenResultBundle = {
  resultRoot: string;
  manifestPath: string;
  manifest: ResultManifest;
};

function topUnverifiedItems(synthesis: AnalysisSynthesis) {
  return synthesis.claims
    .filter((claim) => claim.bucket === 'UNVERIFIED')
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 5)
    .map((claim) => ({
      id: claim.id,
      confidence: claim.confidence,
      bucket: 'UNVERIFIED' as const,
    }));
}

function renderExecutiveBrief(input: {
  synthesis: AnalysisSynthesis;
  outcomeClass: ResultManifest['outcomeClass'];
  primaryAction: ResultManifest['primaryAction'];
  routingDecision: RoutingDecision;
  recovery: RecoveryRecord[];
  modelUsed?: string;
}): string {
  const modelUsed = input.modelUsed ?? 'not executed';
  const lines = [
    `# Executive Brief`,
    '',
    input.synthesis.executiveBrief,
    '',
    `- Outcome: \`${input.outcomeClass}\``,
    `- Primary action: \`${input.primaryAction}\``,
    `- Model tier: \`${input.routingDecision.selectedTier}\``,
    `- Model used: \`${modelUsed}\``,
  ];

  if (input.recovery.length > 0) {
    lines.push(
      `- Recovery: ${input.recovery
        .map((record) => `${record.action}:${record.status}`)
        .join(', ')}`,
    );
  }

  return `${lines.join('\n')}\n`;
}

/**
 * Writes the canonical analysis result bundle under `.local/runs/<runId>/result`.
 *
 * @param input - Prepared bundle, synthesis, routing, recovery, and metadata.
 * @returns Result root, manifest path, and parsed result manifest.
 */
export async function writeResultBundle(
  input: ResultBundleWriteInput,
): Promise<WrittenResultBundle> {
  const resultRoot = resolveResultArtifactRoot(
    input.prepBundle.manifest.repoRoot,
    input.prepBundle.manifest.runId,
  );
  await mkdir(resultRoot, { recursive: true });
  const openQuestionsPath = path.join(resultRoot, 'open_questions.json');

  const resultFiles = {
    executiveBrief: path.join(resultRoot, 'executive_brief.md'),
    decisionReport: path.join(resultRoot, 'decision_report.json'),
    evidenceMap: path.join(resultRoot, 'evidence_map.json'),
    implementationChecklist: path.join(
      resultRoot,
      'implementation_checklist.json',
    ),
    validationChecklist: path.join(resultRoot, 'validation_checklist.json'),
    openQuestions:
      input.synthesis.openQuestions.length > 0 ? openQuestionsPath : undefined,
  };
  const recommendedReadOrder = [
    'result_manifest.json',
    'decision_report.json',
    'implementation_checklist.json',
    'evidence_map.json',
    'validation_checklist.json',
  ];

  if (resultFiles.openQuestions !== undefined) {
    recommendedReadOrder.push('open_questions.json');
  }

  const decisionReport = decisionReportSchema.parse({
    schemaVersion: '1',
    generatedAt: input.generatedAt,
    semanticOutcome: input.synthesis.semanticOutcome,
    summary: input.synthesis.summary,
    topRiskSignals: input.synthesis.topRiskSignals,
    claims: input.synthesis.claims,
    recommendedNextMode: input.synthesis.recommendedNextMode,
    promotionReason: input.synthesis.promotionReason,
    promotionConfidence: input.synthesis.promotionConfidence,
  });

  const evidenceMap = evidenceMapSchema.parse({
    schemaVersion: '1',
    generatedAt: input.generatedAt,
    claims: input.synthesis.claims.map((claim) => ({
      claimId: claim.id,
      evidenceRefs: claim.evidenceRefs,
    })),
  });

  const implementationChecklist = implementationChecklistSchema.parse({
    schemaVersion: '1',
    generatedAt: input.generatedAt,
    items: input.synthesis.implementationChecklist,
  });

  const validationChecklist = validationChecklistSchema.parse({
    schemaVersion: '1',
    generatedAt: input.generatedAt,
    items: input.synthesis.validationChecklist,
  });

  const openQuestions =
    input.synthesis.openQuestions.length > 0
      ? openQuestionsSchema.parse({
          schemaVersion: '1',
          generatedAt: input.generatedAt,
          questions: input.synthesis.openQuestions,
        })
      : null;

  const manifest = resultManifestSchema.parse({
    schemaVersion: '1',
    runId: input.prepBundle.manifest.runId,
    mode: input.prepBundle.manifest.mode,
    prepManifestPath: input.prepBundle.manifestPath,
    resultRoot,
    createdAt: input.generatedAt,
    outcomeClass: input.outcomeClass,
    primaryAction: input.primaryAction,
    modelUsed: input.modelUsed,
    routingDecision: input.routingDecision,
    recovery: input.recovery,
    topRiskSignals:
      input.synthesis.topRiskSignals.length > 0
        ? input.synthesis.topRiskSignals
        : input.structuralAssessment.topRiskSignals,
    topUnverifiedItems: topUnverifiedItems(input.synthesis),
    recommendedNextMode: input.synthesis.recommendedNextMode,
    promotionReason: input.synthesis.promotionReason,
    promotionConfidence: input.synthesis.promotionConfidence,
    recommendedReadOrder,
    stopConditions: input.structuralAssessment.stopConditions,
    sourceFamilies: input.prepBundle.manifest.sourceFamilies,
    resultFiles,
  });
  const manifestPath = path.join(resultRoot, 'result_manifest.json');

  await Promise.all([
    Bun.write(
      resultFiles.executiveBrief,
      renderExecutiveBrief({
        synthesis: input.synthesis,
        outcomeClass: input.outcomeClass,
        primaryAction: input.primaryAction,
        routingDecision: input.routingDecision,
        recovery: input.recovery,
        modelUsed: input.modelUsed,
      }),
    ),
    writeJsonFileAtomic(resultFiles.decisionReport, decisionReport),
    writeJsonFileAtomic(resultFiles.evidenceMap, evidenceMap),
    writeJsonFileAtomic(
      resultFiles.implementationChecklist,
      implementationChecklist,
    ),
    writeJsonFileAtomic(resultFiles.validationChecklist, validationChecklist),
    openQuestions && resultFiles.openQuestions
      ? writeJsonFileAtomic(resultFiles.openQuestions, openQuestions)
      : rm(openQuestionsPath, { force: true }),
  ]);
  await writeJsonFileAtomic(manifestPath, manifest);

  return {
    resultRoot,
    manifestPath,
    manifest,
  };
}

import type {
  ArtifactProvenance,
  DependencyMetaEntry,
  PreflightSummary,
  UsageArtifact,
  UsagePackageEntry,
} from '../../schemas';
import { usageArtifactSchema } from '../../schemas';
import { runCommand } from '../exec/run-command';
import { stripVersionFromPackageSpec } from '../packages/package-spec';

const BUN_TIMEOUT_MS = 30_000;

function bunProvenance(notes: string[] = []): ArtifactProvenance {
  return {
    sourceFamilies: ['bun'],
    commands: [],
    freshness: 'fresh',
    notes,
  };
}

function isBunAvailable(preflight: PreflightSummary): boolean {
  return preflight.tools.some(
    (tool) => tool.toolName === 'bun' && tool.available,
  );
}

function parseBunAuditJson(rawText: string): unknown {
  const jsonStart = rawText.indexOf('{');

  if (jsonStart === -1) {
    return { rawText };
  }

  try {
    return JSON.parse(rawText.slice(jsonStart)) as unknown;
  } catch {
    return { rawText };
  }
}

export function bunAuditCollected(
  auditResult: Awaited<ReturnType<typeof runCommand>>,
): boolean {
  return (
    !auditResult.timedOut &&
    auditResult.stdout.length > 0 &&
    (auditResult.exitCode === 0 || auditResult.exitCode === 1)
  );
}

/**
 * Collects `bun audit --json` once and per-package `bun why` traces into the `usage` artifact family.
 *
 * @param input - Repository root, generation timestamp, preflight result, and requested package metadata.
 * @returns Usage artifact containing per-package `bun why` traces plus shared audit metadata when available.
 */
export async function collectUsageArtifact(input: {
  repoRoot: string;
  generatedAt: string;
  preflight: PreflightSummary;
  packages: DependencyMetaEntry[];
}): Promise<UsageArtifact> {
  const provenance = bunProvenance();

  if (!isBunAvailable(input.preflight)) {
    return usageArtifactSchema.parse({
      schemaVersion: '1',
      family: 'usage',
      generatedAt: input.generatedAt,
      packages: input.packages.map((entry) => ({
        package: entry.package,
        status: 'degraded',
        declaredVersions: entry.declaredVersions,
        error: 'bun unavailable during preflight',
      })),
      provenance: bunProvenance(['bun unavailable during preflight']),
    });
  }

  const auditCommand = ['bun', 'audit', '--json'];
  provenance.commands.push(auditCommand.join(' '));
  const auditResult = await runCommand(auditCommand, {
    cwd: input.repoRoot,
    timeoutMs: BUN_TIMEOUT_MS,
  });

  const auditSucceeded = bunAuditCollected(auditResult);
  const auditJson =
    auditSucceeded && auditResult.stdout.length > 0
      ? parseBunAuditJson(auditResult.stdout)
      : undefined;
  const auditError =
    auditSucceeded || auditResult.stdout.length > 0
      ? undefined
      : auditResult.stderr ||
        (auditResult.timedOut ? 'bun audit timed out' : 'bun audit failed');

  if (auditSucceeded && auditResult.stdout.length === 0) {
    // Preserve the fact that the command succeeded but returned no JSON payload.
    provenance.notes.push('bun audit returned no JSON payload');
  }

  const packages: UsagePackageEntry[] = [];

  for (const entry of input.packages) {
    const whyCommand = ['bun', 'why', entry.package, '--top', '--depth', '4'];
    provenance.commands.push(whyCommand.join(' '));
    const whyResult = await runCommand(whyCommand, {
      cwd: input.repoRoot,
      timeoutMs: BUN_TIMEOUT_MS,
    });

    const whySucceeded = !whyResult.timedOut && whyResult.exitCode === 0;

    packages.push({
      package: stripVersionFromPackageSpec(entry.package),
      status: whySucceeded && auditSucceeded ? 'collected' : 'degraded',
      whyText: whyResult.stdout.length > 0 ? whyResult.stdout : undefined,
      auditJson,
      declaredVersions: entry.declaredVersions,
      error:
        [
          auditError,
          whySucceeded ? undefined : whyResult.stderr || 'bun why failed',
        ]
          .filter((value): value is string => value !== undefined)
          .join('; ') || undefined,
    });
  }

  return usageArtifactSchema.parse({
    schemaVersion: '1',
    family: 'usage',
    generatedAt: input.generatedAt,
    packages,
    provenance,
  });
}

import type {
  ArtifactProvenance,
  DependencyMetaEntry,
  PreflightSummary,
  UsageArtifact,
  UsagePackageEntry,
} from '../../schemas';
import { usageArtifactSchema } from '../../schemas';
import { runCommand } from '../exec/run-command';
import { stripVersionFromPackageSpec } from './opensrc';

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

/**
 * Collects `bun audit --json` once and per-package `bun why` traces into the `usage` artifact family.
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

  let auditJson: unknown;
  if (auditResult.stdout.length > 0) {
    try {
      auditJson = JSON.parse(
        auditResult.stdout.replace(/^.*\{/, '{'),
      ) as unknown;
    } catch {
      auditJson = { rawText: auditResult.stdout };
    }
  }

  const packages: UsagePackageEntry[] = [];

  for (const entry of input.packages) {
    const whyCommand = ['bun', 'why', entry.package, '--top', '--depth', '4'];
    provenance.commands.push(whyCommand.join(' '));
    const whyResult = await runCommand(whyCommand, {
      cwd: input.repoRoot,
      timeoutMs: BUN_TIMEOUT_MS,
    });

    packages.push({
      package: stripVersionFromPackageSpec(entry.package),
      status: whyResult.exitCode === 0 ? 'collected' : 'degraded',
      whyText: whyResult.stdout.length > 0 ? whyResult.stdout : undefined,
      auditJson,
      declaredVersions: entry.declaredVersions,
      error:
        whyResult.exitCode === 0
          ? undefined
          : whyResult.stderr || 'bun why failed',
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

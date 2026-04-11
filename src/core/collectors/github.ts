import type {
  ArtifactProvenance,
  PreflightSummary,
  ReleasesArtifact,
  ReleasesPackageEntry,
  SourcePathsArtifact,
} from '../../schemas';
import { releasesArtifactSchema } from '../../schemas';
import { runCommand } from '../exec/run-command';

const GH_TIMEOUT_MS = 30_000;

function ghProvenance(notes: string[] = []): ArtifactProvenance {
  return {
    sourceFamilies: ['gh'],
    commands: [],
    freshness: 'fresh',
    notes,
  };
}

function isGhAvailable(preflight: PreflightSummary): boolean {
  return preflight.tools.some(
    (tool) => tool.toolName === 'gh' && tool.available,
  );
}

/**
 * Parses JSON rows from `gh release list --json ...` into structured release items.
 *
 * @param rawText - JSON output from `gh release list --json name,tagName,publishedAt,isLatest`.
 * @returns Structured release rows normalized to the releases artifact shape.
 */
export function parseGhReleaseList(rawText: string) {
  const releases = JSON.parse(rawText) as Array<{
    isLatest?: boolean;
    name?: string | null;
    publishedAt?: string | null;
    tagName?: string | null;
  }>;

  return releases.map((release, index) => ({
    name: release.name ?? undefined,
    tagName: release.tagName ?? release.name ?? `release_${index}`,
    publishedAt: release.publishedAt ?? undefined,
    isLatest: Boolean(release.isLatest),
  }));
}

/**
 * Fetches recent releases per package using `gh release list` when `gh` is available and `owner/repo` is known.
 *
 * @param input - Repository root, generation timestamp, preflight summary, and resolved package repositories.
 * @returns Releases artifact with the latest release metadata or degraded package entries.
 */
export async function collectReleasesArtifact(input: {
  repoRoot: string;
  generatedAt: string;
  preflight: PreflightSummary;
  sourcePaths: SourcePathsArtifact;
}): Promise<ReleasesArtifact> {
  const provenance = ghProvenance();

  if (!isGhAvailable(input.preflight)) {
    return releasesArtifactSchema.parse({
      schemaVersion: '1',
      family: 'releases',
      generatedAt: input.generatedAt,
      packages: input.sourcePaths.packages.map((entry) => ({
        package: entry.package,
        repository: entry.repository,
        status: 'degraded',
        releases: [],
        error: 'gh unavailable during preflight',
      })),
      provenance: ghProvenance(['gh unavailable during preflight']),
    });
  }

  const packages: ReleasesPackageEntry[] = [];

  for (const entry of input.sourcePaths.packages) {
    if (!entry.repository) {
      packages.push({
        package: entry.package,
        status: 'degraded',
        releases: [],
        error: 'repository could not be derived from source paths',
      });
      continue;
    }

    const command = [
      'gh',
      'release',
      'list',
      '--repo',
      entry.repository,
      '--json',
      'name,tagName,publishedAt,isLatest',
      '--limit',
      '10',
    ];
    provenance.commands.push(command.join(' '));
    const result = await runCommand(command, {
      cwd: input.repoRoot,
      timeoutMs: GH_TIMEOUT_MS,
    });

    let releases: ReleasesPackageEntry['releases'] = [];
    let status: ReleasesPackageEntry['status'] =
      result.exitCode === 0 ? 'collected' : 'degraded';
    let error =
      result.exitCode === 0
        ? undefined
        : result.stderr || 'gh release list failed';

    if (result.exitCode === 0 && result.stdout.length > 0) {
      try {
        releases = parseGhReleaseList(result.stdout);
      } catch {
        status = 'degraded';
        error = 'gh release list returned invalid JSON';
      }
    }

    packages.push({
      package: entry.package,
      repository: entry.repository,
      status,
      releases,
      rawText: result.stdout.length > 0 ? result.stdout : undefined,
      error,
    });
  }

  return releasesArtifactSchema.parse({
    schemaVersion: '1',
    family: 'releases',
    generatedAt: input.generatedAt,
    packages,
    provenance,
  });
}

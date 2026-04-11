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
 * Parses tab-separated lines from `gh release list` into structured release rows.
 */
export function parseGhReleaseList(rawText: string) {
  return rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [name, latestMarker, tagName, publishedAt] = line.split('\t');
      return {
        name: name || undefined,
        tagName: tagName || name || `release_${index}`,
        publishedAt: publishedAt || undefined,
        isLatest: latestMarker === 'Latest',
      };
    });
}

/**
 * Fetches recent releases per package using `gh release list` when `gh` is available and `owner/repo` is known.
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
      '--limit',
      '10',
    ];
    provenance.commands.push(command.join(' '));
    const result = await runCommand(command, {
      cwd: input.repoRoot,
      timeoutMs: GH_TIMEOUT_MS,
    });

    packages.push({
      package: entry.package,
      repository: entry.repository,
      status: result.exitCode === 0 ? 'collected' : 'degraded',
      releases: result.exitCode === 0 ? parseGhReleaseList(result.stdout) : [],
      rawText: result.stdout.length > 0 ? result.stdout : undefined,
      error:
        result.exitCode === 0
          ? undefined
          : result.stderr || 'gh release list failed',
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

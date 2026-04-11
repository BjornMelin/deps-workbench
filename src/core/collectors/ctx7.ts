import type {
  ArtifactProvenance,
  DocsArtifact,
  DocsPackageEntry,
  PreflightSummary,
  PrepRequest,
} from '../../schemas';
import { docsArtifactSchema } from '../../schemas';
import { runCommand } from '../exec/run-command';
import { stripVersionFromPackageSpec } from '../packages/package-spec';

const CTX7_TIMEOUT_MS = 45_000;
const DEFAULT_DOC_QUERY = 'migration guide breaking changes latest version';

function ctx7Provenance(notes: string[] = []): ArtifactProvenance {
  return {
    sourceFamilies: ['ctx7'],
    commands: [],
    freshness: 'fresh',
    notes,
  };
}

function isCtx7Available(preflight: PreflightSummary): boolean {
  return preflight.tools.some(
    (tool) => tool.toolName === 'ctx7' && tool.available,
  );
}

function parseJsonResult(rawText: string): unknown {
  return JSON.parse(rawText) as unknown;
}

/**
 * Resolves library ids and documentation snippets via `ctx7 library` / `ctx7 docs` per package.
 */
export async function collectDocsArtifact(input: {
  repoRoot: string;
  generatedAt: string;
  preflight: PreflightSummary;
  request: PrepRequest;
}): Promise<DocsArtifact> {
  const provenance = ctx7Provenance();

  if (!isCtx7Available(input.preflight)) {
    return docsArtifactSchema.parse({
      schemaVersion: '1',
      family: 'docs',
      generatedAt: input.generatedAt,
      packages: input.request.packages.map((packageName) => ({
        package: stripVersionFromPackageSpec(packageName),
        query: DEFAULT_DOC_QUERY,
        status: 'degraded',
        error: 'ctx7 unavailable during preflight',
      })),
      provenance: ctx7Provenance(['ctx7 unavailable during preflight']),
    });
  }

  const packages: DocsPackageEntry[] = [];

  for (const packageName of input.request.packages) {
    const normalizedPackageName = stripVersionFromPackageSpec(packageName);
    const libraryCommand = [
      'ctx7',
      'library',
      normalizedPackageName,
      DEFAULT_DOC_QUERY,
      '--json',
    ];
    provenance.commands.push(libraryCommand.join(' '));
    const libraryResult = await runCommand(libraryCommand, {
      cwd: input.repoRoot,
      timeoutMs: CTX7_TIMEOUT_MS,
    });

    if (libraryResult.exitCode !== 0 || libraryResult.stdout.length === 0) {
      packages.push({
        package: normalizedPackageName,
        query: DEFAULT_DOC_QUERY,
        status: 'degraded',
        error: libraryResult.stderr || 'ctx7 library lookup failed',
      });
      continue;
    }

    let resolvedLibraries: Array<{ id?: string }>;

    try {
      resolvedLibraries = parseJsonResult(libraryResult.stdout) as Array<{
        id?: string;
      }>;
    } catch {
      packages.push({
        package: normalizedPackageName,
        query: DEFAULT_DOC_QUERY,
        status: 'degraded',
        raw: { libraryText: libraryResult.stdout },
        error: 'ctx7 library returned invalid JSON',
      });
      continue;
    }

    const libraryId = resolvedLibraries[0]?.id;

    if (!libraryId) {
      packages.push({
        package: normalizedPackageName,
        query: DEFAULT_DOC_QUERY,
        status: 'degraded',
        raw: { library: resolvedLibraries },
        error: 'ctx7 returned no matching library id',
      });
      continue;
    }

    const docsCommand = [
      'ctx7',
      'docs',
      libraryId,
      DEFAULT_DOC_QUERY,
      '--json',
    ];
    provenance.commands.push(docsCommand.join(' '));
    const docsResult = await runCommand(docsCommand, {
      cwd: input.repoRoot,
      timeoutMs: CTX7_TIMEOUT_MS,
    });

    if (docsResult.exitCode !== 0) {
      packages.push({
        package: normalizedPackageName,
        query: DEFAULT_DOC_QUERY,
        libraryId,
        status: 'degraded',
        raw: { library: resolvedLibraries },
        error: docsResult.stderr || 'ctx7 docs query failed',
      });
      continue;
    }

    let docsRaw: unknown;

    try {
      docsRaw = parseJsonResult(docsResult.stdout);
    } catch {
      packages.push({
        package: normalizedPackageName,
        query: DEFAULT_DOC_QUERY,
        libraryId,
        status: 'degraded',
        raw: {
          library: resolvedLibraries,
          docsText: docsResult.stdout,
        },
        error: 'ctx7 docs returned invalid JSON',
      });
      continue;
    }

    packages.push({
      package: normalizedPackageName,
      query: DEFAULT_DOC_QUERY,
      libraryId,
      status: 'collected',
      raw: {
        library: resolvedLibraries,
        docs: docsRaw,
      },
    });
  }

  return docsArtifactSchema.parse({
    schemaVersion: '1',
    family: 'docs',
    generatedAt: input.generatedAt,
    packages,
    provenance,
  });
}

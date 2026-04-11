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

type FailedDocsLookup = {
  commandStrings: string[];
  packageEntry: DocsPackageEntry;
};

type SuccessfulLibraryLookup = {
  commandStrings: string[];
  libraryId: string;
  normalizedPackageName: string;
  resolvedLibraries: Array<{ id?: string }>;
};

type CompletedDocsLookup = {
  commandStrings: string[];
  packageEntry: DocsPackageEntry;
};

type LibraryLookupResult = FailedDocsLookup | SuccessfulLibraryLookup;

/**
 * Resolves library ids and documentation snippets via `ctx7 library` / `ctx7 docs` per package.
 *
 * @param input - Repository root, generation timestamp, preflight summary, and requested packages.
 * @returns Docs artifact containing per-package documentation lookups or degraded entries.
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

  const libraryLookups: Array<Promise<LibraryLookupResult>> =
    input.request.packages.map(async (packageName) => {
      const normalizedPackageName = stripVersionFromPackageSpec(packageName);
      const libraryCommand = [
        'ctx7',
        'library',
        normalizedPackageName,
        DEFAULT_DOC_QUERY,
        '--json',
      ];
      const libraryCommandString = libraryCommand.join(' ');
      const libraryResult = await runCommand(libraryCommand, {
        cwd: input.repoRoot,
        timeoutMs: CTX7_TIMEOUT_MS,
      });

      if (libraryResult.exitCode !== 0 || libraryResult.stdout.length === 0) {
        return {
          commandStrings: [libraryCommandString],
          packageEntry: {
            package: normalizedPackageName,
            query: DEFAULT_DOC_QUERY,
            status: 'degraded',
            error: libraryResult.stderr || 'ctx7 library lookup failed',
          },
        } satisfies FailedDocsLookup;
      }

      let resolvedLibraries: Array<{ id?: string }>;

      try {
        resolvedLibraries = parseJsonResult(libraryResult.stdout) as Array<{
          id?: string;
        }>;
      } catch {
        return {
          commandStrings: [libraryCommandString],
          packageEntry: {
            package: normalizedPackageName,
            query: DEFAULT_DOC_QUERY,
            status: 'degraded',
            raw: { libraryText: libraryResult.stdout },
            error: 'ctx7 library returned invalid JSON',
          },
        } satisfies FailedDocsLookup;
      }

      const libraryId = resolvedLibraries[0]?.id;

      if (!libraryId) {
        return {
          commandStrings: [libraryCommandString],
          packageEntry: {
            package: normalizedPackageName,
            query: DEFAULT_DOC_QUERY,
            status: 'degraded',
            raw: { library: resolvedLibraries },
            error: 'ctx7 returned no matching library id',
          },
        } satisfies FailedDocsLookup;
      }

      return {
        commandStrings: [libraryCommandString],
        normalizedPackageName,
        libraryId,
        resolvedLibraries,
      } satisfies SuccessfulLibraryLookup;
    });

  const libraryResults = await Promise.all(libraryLookups);
  const docsLookups = libraryResults.map(async (libraryResult) => {
    if ('packageEntry' in libraryResult) {
      return {
        commandStrings: libraryResult.commandStrings,
        packageEntry: libraryResult.packageEntry,
      } satisfies CompletedDocsLookup;
    }

    const docsCommand = [
      'ctx7',
      'docs',
      libraryResult.libraryId,
      DEFAULT_DOC_QUERY,
      '--json',
    ];
    const docsCommandString = docsCommand.join(' ');
    const docsResult = await runCommand(docsCommand, {
      cwd: input.repoRoot,
      timeoutMs: CTX7_TIMEOUT_MS,
    });

    if (docsResult.exitCode !== 0) {
      return {
        commandStrings: [...libraryResult.commandStrings, docsCommandString],
        packageEntry: {
          package: libraryResult.normalizedPackageName,
          query: DEFAULT_DOC_QUERY,
          libraryId: libraryResult.libraryId,
          status: 'degraded',
          raw: { library: libraryResult.resolvedLibraries },
          error: docsResult.stderr || 'ctx7 docs query failed',
        },
      } satisfies CompletedDocsLookup;
    }

    let docsRaw: unknown;

    try {
      docsRaw = parseJsonResult(docsResult.stdout);
    } catch {
      return {
        commandStrings: [...libraryResult.commandStrings, docsCommandString],
        packageEntry: {
          package: libraryResult.normalizedPackageName,
          query: DEFAULT_DOC_QUERY,
          libraryId: libraryResult.libraryId,
          status: 'degraded',
          raw: {
            library: libraryResult.resolvedLibraries,
            docsText: docsResult.stdout,
          },
          error: 'ctx7 docs returned invalid JSON',
        },
      } satisfies CompletedDocsLookup;
    }

    return {
      commandStrings: [...libraryResult.commandStrings, docsCommandString],
      packageEntry: {
        package: libraryResult.normalizedPackageName,
        query: DEFAULT_DOC_QUERY,
        libraryId: libraryResult.libraryId,
        status: 'collected',
        raw: {
          library: libraryResult.resolvedLibraries,
          docs: docsRaw,
        },
      },
    } satisfies CompletedDocsLookup;
  });

  const packages = await Promise.all(docsLookups);
  for (const result of packages) {
    provenance.commands.push(...result.commandStrings);
  }

  return docsArtifactSchema.parse({
    schemaVersion: '1',
    family: 'docs',
    generatedAt: input.generatedAt,
    packages: packages.map((result) => result.packageEntry),
    provenance,
  });
}

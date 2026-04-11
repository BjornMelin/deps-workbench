import path from 'node:path';

import type {
  DependencyMetaEntry,
  DependencyOccurrence,
  PrepRepoSummary,
} from '../../schemas';
import { stripVersionFromPackageSpec } from '../packages/package-spec';

const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
  'resolutions',
  'overrides',
] as const;

type PackageJsonRecord = {
  packageManager?: string;
  workspaces?: string[] | { packages?: string[] };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  resolutions?: Record<string, string | Record<string, unknown>>;
  overrides?: Record<string, string | Record<string, unknown>>;
};

type DependencyFieldRecord = Record<string, string | Record<string, unknown>>;

function normalizeWorkspacePattern(pattern: string): string {
  return pattern.endsWith('package.json')
    ? pattern
    : path.posix.join(pattern, 'package.json');
}

function extractWorkspacePatterns(packageJson: PackageJsonRecord): string[] {
  if (Array.isArray(packageJson.workspaces)) {
    return packageJson.workspaces;
  }

  if (
    packageJson.workspaces !== undefined &&
    typeof packageJson.workspaces === 'object' &&
    Array.isArray(packageJson.workspaces.packages)
  ) {
    return packageJson.workspaces.packages;
  }

  return [];
}

async function readPackageJson(filePath: string): Promise<PackageJsonRecord> {
  return JSON.parse(await Bun.file(filePath).text()) as PackageJsonRecord;
}

/** Workspace scan: repo summary plus per-requested-package dependency metadata. */
export type RepoPackageScan = {
  repo: PrepRepoSummary;
  packages: DependencyMetaEntry[];
};

type DiscoveredPackageJsonFiles = {
  rootManifest: PackageJsonRecord;
  packageJsonFiles: string[];
};

function readDependencySpec(
  record: DependencyFieldRecord | undefined,
  requestedPackage: string,
): string | undefined {
  if (!record) {
    return undefined;
  }

  const spec = record[requestedPackage];

  return typeof spec === 'string' ? spec : undefined;
}

/**
 * Resolves root `package.json` plus workspace globs to a sorted list of manifest paths.
 *
 * @param repoRoot - Repository root containing the workspace manifests.
 * @returns Root manifest plus sorted absolute manifest paths for the root package and all discovered workspaces.
 */
export async function discoverPackageJsonFiles(
  repoRoot: string,
): Promise<DiscoveredPackageJsonFiles> {
  const rootPackageJsonPath = path.join(repoRoot, 'package.json');
  const rootManifest = await readPackageJson(rootPackageJsonPath);
  const patterns = extractWorkspacePatterns(rootManifest);
  const files = new Set<string>([rootPackageJsonPath]);

  for (const pattern of patterns) {
    const glob = new Bun.Glob(normalizeWorkspacePattern(pattern));

    for await (const relativeMatch of glob.scan({ cwd: repoRoot })) {
      files.add(path.resolve(repoRoot, relativeMatch));
    }
  }

  return {
    rootManifest,
    packageJsonFiles: Array.from(files).sort(),
  };
}

/**
 * Finds declared dependency specs for the given package names across all discovered manifests.
 *
 * @param repoRoot - Repository root containing the workspace manifests.
 * @param packages - Requested package specs to match across dependency fields.
 * @returns Repo summary plus per-package occurrences and declared versions.
 */
export async function scanRepoForRequestedPackages(
  repoRoot: string,
  packages: string[],
): Promise<RepoPackageScan> {
  const { rootManifest, packageJsonFiles } =
    await discoverPackageJsonFiles(repoRoot);
  const lockfilePresent = await Bun.file(
    path.join(repoRoot, 'bun.lock'),
  ).exists();
  const requestedPackages = Array.from(
    new Set(
      packages.map((packageSpec) => stripVersionFromPackageSpec(packageSpec)),
    ),
  );

  const entries = new Map<string, DependencyOccurrence[]>();

  for (const requestedPackage of requestedPackages) {
    entries.set(requestedPackage, []);
  }

  for (const packageJsonFile of packageJsonFiles) {
    const manifest = await readPackageJson(packageJsonFile);

    for (const field of DEPENDENCY_FIELDS) {
      const record = manifest[field] as DependencyFieldRecord | undefined;

      for (const requestedPackage of requestedPackages) {
        const spec = readDependencySpec(record, requestedPackage);

        if (spec === undefined) {
          continue;
        }

        entries.get(requestedPackage)?.push({
          manifestPath: packageJsonFile,
          field,
          spec,
        });
      }
    }
  }

  return {
    repo: {
      root: repoRoot,
      packageManager: rootManifest.packageManager,
      hasWorkspaces: extractWorkspacePatterns(rootManifest).length > 0,
      workspaceCount: Math.max(0, packageJsonFiles.length - 1),
      packageJsonCount: packageJsonFiles.length,
      lockfilePresent,
    },
    packages: requestedPackages.map((requestedPackage) => {
      const occurrences = entries.get(requestedPackage) ?? [];

      return {
        package: requestedPackage,
        occurrences,
        declaredVersions: Array.from(
          new Set(occurrences.map((occurrence) => occurrence.spec)),
        ),
      };
    }),
  };
}

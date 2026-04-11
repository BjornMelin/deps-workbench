import path from 'node:path';

import type {
  DependencyMetaEntry,
  DependencyOccurrence,
  PrepRepoSummary,
} from '../../schemas';

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
  resolutions?: Record<string, string>;
  overrides?: Record<string, string>;
};

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
  return (
    (JSON.parse(await Bun.file(filePath).text()) as PackageJsonRecord) ?? {}
  );
}

/** Workspace scan: repo summary plus per-requested-package dependency metadata. */
export type RepoPackageScan = {
  repo: PrepRepoSummary;
  packages: DependencyMetaEntry[];
};

/**
 * Resolves root `package.json` plus workspace globs to a sorted list of manifest paths.
 */
export async function discoverPackageJsonFiles(
  repoRoot: string,
): Promise<string[]> {
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

  return Array.from(files).sort();
}

/**
 * Finds declared dependency specs for the given package names across all discovered manifests.
 */
export async function scanRepoForRequestedPackages(
  repoRoot: string,
  packages: string[],
): Promise<RepoPackageScan> {
  const packageJsonFiles = await discoverPackageJsonFiles(repoRoot);
  const rootManifest = await readPackageJson(
    path.join(repoRoot, 'package.json'),
  );
  const lockfilePresent = await Bun.file(
    path.join(repoRoot, 'bun.lock'),
  ).exists();
  const requestedPackages = Array.from(new Set(packages));

  const entries = new Map<string, DependencyOccurrence[]>();

  for (const requestedPackage of requestedPackages) {
    entries.set(requestedPackage, []);
  }

  for (const packageJsonFile of packageJsonFiles) {
    const manifest = await readPackageJson(packageJsonFile);

    for (const field of DEPENDENCY_FIELDS) {
      const record = manifest[field] as Record<string, string> | undefined;

      if (!record) {
        continue;
      }

      for (const requestedPackage of requestedPackages) {
        const spec = record[requestedPackage];

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
      workspaceCount: packageJsonFiles.length,
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

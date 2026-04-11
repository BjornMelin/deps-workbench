import type {
  PrepareBundleOptions,
  PrepareBundleResult,
} from '../core/prep/prepare-bundle';
import { createPrepBundle } from '../core/prep/prepare-bundle';

/** Options for the `prepare` CLI, including optional JSON manifest output. */
export type PrepareCommandOptions = PrepareBundleOptions & {
  json?: boolean;
};

/**
 * Help text for `deps-workbench prepare` (flags and behavior summary).
 */
export function getPrepareHelp(): string {
  return [
    'Usage: deps-workbench prepare [options] <package...>',
    '',
    'Deterministic evidence collection only. Writes a typed prep bundle under .local/runs/<runId>/prep.',
    '',
    'Options:',
    '  --mode <mode>         triage | research | implementation',
    '  --repo-root <path>    repository root to inspect (defaults to cwd)',
    '  --target <version>    explicit target version for requested packages',
    '  --run-id <id>         explicit run id (defaults to generated run id)',
    '  --json                print the manifest as JSON',
    '  --help                show prepare help',
  ].join('\n');
}

function renderPrepareSummary(result: PrepareBundleResult): string {
  return [
    `runId: ${result.manifest.runId}`,
    `mode: ${result.manifest.mode}`,
    `artifactRoot: ${result.manifest.artifactRoot}`,
    `artifactFamilies: ${result.manifest.artifactFamilies.join(', ')}`,
    `degradedArtifactFamilies: ${
      result.manifest.degradedArtifactFamilies.length > 0
        ? result.manifest.degradedArtifactFamilies.join(', ')
        : 'none'
    }`,
    `packages: ${result.manifest.request.packages.join(', ')}`,
  ].join('\n');
}

/**
 * Builds a prep bundle under `.local/runs/<runId>/prep` and prints a summary or JSON manifest.
 *
 * @param options - Repository root, packages, mode, and optional `--json` output.
 */
export async function runPrepareCommand(
  options: PrepareCommandOptions,
): Promise<{ exitCode: number; stdout: string }> {
  const result = await createPrepBundle(options);

  return {
    exitCode: 0,
    stdout: options.json
      ? `${JSON.stringify(result.manifest, null, 2)}\n`
      : `${renderPrepareSummary(result)}\n`,
  };
}

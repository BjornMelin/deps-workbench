import {
  type AnalyzeRunOptions,
  analyzePreparedRun,
} from '../core/runtime/analyze-run';

export type AnalyzeCommandOptions = AnalyzeRunOptions & {
  json?: boolean;
};

export function getAnalyzeHelp(): string {
  return [
    'Usage: deps-workbench analyze --run-id <id> [options]',
    '',
    'Model-driven analysis over an existing prep bundle only. Writes a typed result bundle under .local/runs/<runId>/result.',
    '',
    'Options:',
    '  --run-id <id>         existing prep run identifier to analyze',
    '  --repo-root <path>    repository root to inspect (defaults to cwd)',
    '  --json                print the result manifest as JSON',
    '  --help                show analyze help',
  ].join('\n');
}

function renderAnalyzeSummary(
  result: Awaited<ReturnType<typeof analyzePreparedRun>>,
): string {
  return [
    `runId: ${result.manifest.runId}`,
    `mode: ${result.manifest.mode}`,
    `outcomeClass: ${result.manifest.outcomeClass}`,
    `primaryAction: ${result.manifest.primaryAction}`,
    `modelUsed: ${result.manifest.modelUsed}`,
    `resultRoot: ${result.resultRoot}`,
  ].join('\n');
}

export async function runAnalyzeCommand(
  options: AnalyzeCommandOptions,
): Promise<{ exitCode: number; stdout: string }> {
  const result = await analyzePreparedRun(options);

  return {
    exitCode: 0,
    stdout: options.json
      ? `${JSON.stringify(result.manifest, null, 2)}\n`
      : `${renderAnalyzeSummary(result)}\n`,
  };
}

/**
 * Temporary CLI entrypoint while the planned command surface is implemented.
 */
export function describeRepoIntent(): string {
  return [
    'deps-workbench bootstrap placeholder',
    'planned commands: prepare, analyze, report, run, resume',
    'execution authority: docs/plan/README.md',
  ].join(' | ');
}

if (import.meta.main) {
  console.log(describeRepoIntent());
}

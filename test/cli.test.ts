import { describe, expect, test } from 'bun:test';

import { describeRepoIntent, parseCliArgs, runCli } from '../src/cli';

describe('describeRepoIntent', () => {
  test('mentions the repo and command surface', () => {
    const output = describeRepoIntent();

    expect(output).toContain('deps-workbench');
    expect(output).toContain('prepare');
    expect(output).toContain('resume');
  });
});

describe('cli parsing', () => {
  test('parses prepare arguments', () => {
    const parsed = parseCliArgs([
      'prepare',
      '--mode',
      'research',
      '--target',
      '4.4.0',
      'zod',
    ]);

    expect(parsed).toEqual({
      kind: 'prepare',
      options: {
        mode: 'research',
        targetVersion: '4.4.0',
        packages: ['zod'],
      },
    });
  });

  test('rejects flag-like tokens as missing option values', () => {
    const parsed = parseCliArgs(['prepare', '--repo-root', '--json', 'zod']);

    expect(parsed).toEqual({
      kind: 'error',
      message: 'Missing value for --repo-root',
      exitCode: 2,
    });
  });

  test('reports placeholder commands clearly', async () => {
    const result = await runCli(['report']);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('report is not implemented yet');
  });
});

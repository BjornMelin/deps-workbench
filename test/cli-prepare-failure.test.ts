import { afterEach, describe, expect, mock, test } from 'bun:test';

afterEach(() => {
  mock.restore();
});

describe('runCli prepare failures', () => {
  test('returns a structured error when prepare throws', async () => {
    mock.module('../src/commands/prepare', () => ({
      getPrepareHelp: () => 'prepare help',
      runPrepareCommand: async () => {
        throw new Error('boom');
      },
    }));

    const { runCli } = await import('../src/cli');
    const result = await runCli(['prepare', 'zod']);

    expect(result).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: 'boom\n',
    });
  });
});

import { describe, expect, test } from 'bun:test';

import { describeRepoIntent } from '../src/cli';

describe('describeRepoIntent', () => {
  test('mentions the repo and planned command surface', () => {
    const output = describeRepoIntent();

    expect(output).toContain('deps-workbench');
    expect(output).toContain('prepare');
    expect(output).toContain('resume');
  });
});

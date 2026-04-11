import { afterEach, describe, expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { formatStagedFilesWithBiome } from '../src/core/exec/format-staged';

const tempRoots: string[] = [];

function runGit(
  repoRoot: string,
  args: string[],
  input?: string,
): { status: number; stderr: string; stdout: string } {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    input,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status === null) {
    throw new Error(`git ${args.join(' ')} terminated unexpectedly`);
  }

  return {
    status: result.status,
    stderr: result.stderr.trimEnd(),
    stdout: result.stdout,
  };
}

async function makeTempRepo(): Promise<string> {
  const repoRoot = await mkdtemp(
    path.join(os.tmpdir(), 'deps-workbench-format-staged-'),
  );
  tempRoots.push(repoRoot);
  runGit(repoRoot, ['init']);
  runGit(repoRoot, ['config', 'user.name', 'Codex']);
  runGit(repoRoot, ['config', 'user.email', 'codex@example.com']);
  return repoRoot;
}

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((tempRoot) => rm(tempRoot, { recursive: true, force: true })),
  );
});

describe('formatStagedFilesWithBiome', () => {
  test('formats staged content and keeps the working tree in sync', async () => {
    const repoRoot = await makeTempRepo();
    const filePath = path.join(repoRoot, 'sample.ts');

    await Bun.write(filePath, 'const value = 1;\n');
    runGit(repoRoot, ['add', 'sample.ts']);
    runGit(repoRoot, ['commit', '-m', 'base']);

    await Bun.write(filePath, 'const  value=2;\n');
    runGit(repoRoot, ['add', 'sample.ts']);

    const result = formatStagedFilesWithBiome(repoRoot);

    expect(result.formattedFiles).toEqual(['sample.ts']);
    expect(result.warnings).toEqual([]);
    expect(await readFile(filePath, 'utf8')).toBe('const value = 2;\n');
    expect(runGit(repoRoot, ['show', ':sample.ts']).stdout).toBe(
      'const value = 2;\n',
    );
  });

  test('preserves unstaged changes while formatting partially staged files', async () => {
    const repoRoot = await makeTempRepo();
    const filePath = path.join(repoRoot, 'sample.ts');

    await Bun.write(
      filePath,
      ['const value = 1;', 'const other = 2;', ''].join('\n'),
    );
    runGit(repoRoot, ['add', 'sample.ts']);
    runGit(repoRoot, ['commit', '-m', 'base']);

    await Bun.write(
      filePath,
      ['const  value=10;', 'const other = 2;', ''].join('\n'),
    );
    runGit(repoRoot, ['add', 'sample.ts']);
    await Bun.write(
      filePath,
      ['const  value=10;', 'const  other=20;', ''].join('\n'),
    );

    const result = formatStagedFilesWithBiome(repoRoot);

    expect(result.formattedFiles).toEqual(['sample.ts']);
    expect(result.warnings).toEqual([]);
    expect(await readFile(filePath, 'utf8')).toBe(
      ['const value = 10;', 'const  other=20;', ''].join('\n'),
    );
    expect(runGit(repoRoot, ['show', ':sample.ts']).stdout).toBe(
      ['const value = 10;', 'const other = 2;', ''].join('\n'),
    );
  });

  test('warns when working tree patching fails on overlapping edits', async () => {
    const repoRoot = await makeTempRepo();
    const filePath = path.join(repoRoot, 'sample.ts');

    await Bun.write(filePath, 'const value = 1;\n');
    runGit(repoRoot, ['add', 'sample.ts']);
    runGit(repoRoot, ['commit', '-m', 'base']);

    await Bun.write(filePath, 'const  value=10;\n');
    runGit(repoRoot, ['add', 'sample.ts']);
    await Bun.write(filePath, 'const  value=20;\n');

    const result = formatStagedFilesWithBiome(repoRoot);

    expect(result.formattedFiles).toEqual(['sample.ts']);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain(
      'Working tree copy of sample.ts was left unchanged',
    );
    expect(await readFile(filePath, 'utf8')).toBe('const  value=20;\n');
    expect(runGit(repoRoot, ['show', ':sample.ts']).stdout).toBe(
      'const value = 10;\n',
    );
  });
});

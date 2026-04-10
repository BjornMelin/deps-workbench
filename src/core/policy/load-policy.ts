import path from 'node:path';

import { ZodError } from 'zod';

import { policySchema, type Policy } from '../../schemas';
import { readJsoncFile } from '../storage/json';
import { resolveRepoRoot } from '../storage/paths';

export class PolicyLoadError extends Error {
  readonly filePath: string;

  constructor(message: string, filePath: string, options?: { cause?: unknown }) {
    super(message, options);
    this.filePath = filePath;
    this.name = 'PolicyLoadError';
  }
}

export function resolveCheckedInPolicyPath(repoRoot = process.cwd()): string {
  return path.join(resolveRepoRoot(repoRoot), 'config', 'deps-workbench.config.jsonc');
}

export async function loadCheckedInPolicy(
  repoRoot = process.cwd(),
): Promise<Policy> {
  const filePath = resolveCheckedInPolicyPath(repoRoot);

  try {
    return await readJsoncFile(filePath, policySchema);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new PolicyLoadError(
        `Invalid checked-in policy at ${filePath}: ${error.issues
          .map(({ path: issuePath, message }) => {
            const renderedPath = issuePath.length > 0 ? issuePath.join('.') : 'root';
            return `${renderedPath} ${message}`;
          })
          .join('; ')}`,
        filePath,
        { cause: error },
      );
    }

    throw new PolicyLoadError(
      `Failed to load checked-in policy at ${filePath}`,
      filePath,
      { cause: error },
    );
  }
}

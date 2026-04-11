import { constants as fsConstants } from 'node:fs';
import { access } from 'node:fs/promises';
import path from 'node:path';

import {
  nonEmptyStringSchema,
  type PreflightSummary,
  preflightSummarySchema,
  type ToolProbe,
} from '../../schemas';
import { runCommand } from '../exec/run-command';

const DEFAULT_TIMEOUT_MS = 5_000;

type ToolSpec = {
  toolName: string;
  requirement: ToolProbe['requirement'];
  versionCommand: string[];
};

const TOOL_SPECS: ToolSpec[] = [
  {
    toolName: 'bun',
    requirement: 'required',
    versionCommand: ['bun', '--version'],
  },
  {
    toolName: 'opensrc',
    requirement: 'required',
    versionCommand: ['opensrc', '--version'],
  },
  {
    toolName: 'ctx7',
    requirement: 'optional',
    versionCommand: ['ctx7', '--version'],
  },
  {
    toolName: 'gh',
    requirement: 'optional',
    versionCommand: ['gh', '--version'],
  },
];

async function findExecutable(toolName: string): Promise<string | undefined> {
  const pathValue = process.env.PATH;

  if (!pathValue) {
    return undefined;
  }

  const searchPaths = pathValue.split(path.delimiter).filter(Boolean);
  const extensions =
    process.platform === 'win32'
      ? (process.env.PATHEXT?.split(';').filter(Boolean) ?? [
          '.EXE',
          '.CMD',
          '.BAT',
        ])
      : [''];

  for (const searchPath of searchPaths) {
    for (const extension of extensions) {
      const candidate = path.join(searchPath, `${toolName}${extension}`);
      try {
        await access(candidate, fsConstants.X_OK);
        return candidate;
      } catch {
        // continue scanning PATH
      }
    }
  }

  return undefined;
}

async function probeTool(tool: ToolSpec): Promise<ToolProbe> {
  const executablePath = await findExecutable(tool.toolName);

  if (!executablePath) {
    return {
      toolName: tool.toolName,
      requirement: tool.requirement,
      available: false,
      notes: ['Executable not found on PATH'],
    };
  }

  const versionResult = await runCommand(tool.versionCommand, {
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });

  const version = versionResult.stdout.split('\n')[0]?.trim();
  const notes: string[] = [];

  if (versionResult.timedOut) {
    notes.push('Version probe timed out');
  }

  if (versionResult.exitCode !== 0 && versionResult.stderr.length > 0) {
    notes.push(versionResult.stderr);
  }

  return {
    toolName: tool.toolName,
    requirement: tool.requirement,
    available: !versionResult.timedOut && versionResult.exitCode === 0,
    executablePath,
    version:
      version !== undefined && version.length > 0
        ? nonEmptyStringSchema.parse(version)
        : undefined,
    notes,
  };
}

/**
 * Probes `bun`, `opensrc`, `ctx7`, and `gh` on `PATH`, records versions, and classifies missing required vs optional tools.
 */
export async function probeExternalTools(): Promise<PreflightSummary> {
  const tools = await Promise.all(TOOL_SPECS.map((tool) => probeTool(tool)));

  return preflightSummarySchema.parse({
    tools,
    missingRequiredTools: tools
      .filter((tool) => tool.requirement === 'required' && !tool.available)
      .map((tool) => tool.toolName),
    missingOptionalTools: tools
      .filter((tool) => tool.requirement === 'optional' && !tool.available)
      .map((tool) => tool.toolName),
  });
}

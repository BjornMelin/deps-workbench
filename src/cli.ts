import { getPrepareHelp, runPrepareCommand } from './commands/prepare';

type ParsedCliCommand =
  | { kind: 'help' }
  | { kind: 'version' }
  | {
      kind: 'prepare';
      options: {
        repoRoot?: string;
        mode?: 'triage' | 'research' | 'implementation';
        packages: string[];
        targetVersion?: string;
        runId?: string;
        json?: boolean;
      };
    }
  | { kind: 'placeholder'; commandName: string }
  | { kind: 'error'; message: string; exitCode: number };

const PLACEHOLDER_COMMANDS = new Set(['analyze', 'report', 'run', 'resume']);

async function readPackageVersion(): Promise<string> {
  try {
    const pkg = (await Bun.file(
      new URL('../package.json', import.meta.url),
    ).json()) as {
      version?: string;
    };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Single-line summary of supported commands and where execution policy is defined.
 *
 * @returns Text intended for help banners and operator-facing diagnostics.
 */
export function describeRepoIntent(): string {
  return [
    'deps-workbench CLI',
    'implemented commands: prepare',
    'planned commands: analyze, report, run, resume',
    'execution authority: docs/plan/README.md',
  ].join(' | ');
}

/**
 * Global CLI usage and command list (excludes per-command help such as `prepare`).
 *
 * @returns Newline-separated help text for the top-level CLI command surface.
 */
export function getCliHelp(): string {
  return [
    'Usage: deps-workbench <command> [options]',
    '',
    describeRepoIntent(),
    '',
    'Commands:',
    '  prepare   deterministic local evidence collection only',
    '  analyze   reserved for Phase 04',
    '  report    reserved for Phase 05',
    '  run       reserved for Phase 05',
    '  resume    reserved for Phase 05',
    '',
    'Global options:',
    '  --help     show this help',
    '  --version  print the CLI version',
  ].join('\n');
}

function requireOptionValue(
  args: string[],
  index: number,
  flagName: string,
): string | ParsedCliCommand {
  const value = args[index + 1];
  if (value === undefined || value.startsWith('--')) {
    return {
      kind: 'error',
      message: `Missing value for ${flagName}`,
      exitCode: 2,
    };
  }

  return value;
}

function parsePrepareArgs(args: string[]): ParsedCliCommand {
  const options: ParsedCliCommand & { kind: 'prepare' } = {
    kind: 'prepare',
    options: {
      packages: [],
    },
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === undefined) {
      break;
    }

    if (arg === '--help') {
      return { kind: 'help' };
    }

    if (arg === '--json') {
      options.options.json = true;
      continue;
    }

    if (arg === '--mode') {
      const value = requireOptionValue(args, index, '--mode');
      if (typeof value !== 'string') {
        return value;
      }

      if (!['triage', 'research', 'implementation'].includes(value)) {
        return {
          kind: 'error',
          message: `Invalid --mode value: ${value}`,
          exitCode: 2,
        };
      }

      options.options.mode = value as 'triage' | 'research' | 'implementation';
      index += 1;
      continue;
    }

    if (arg === '--repo-root') {
      const value = requireOptionValue(args, index, '--repo-root');
      if (typeof value !== 'string') {
        return value;
      }

      options.options.repoRoot = value;
      index += 1;
      continue;
    }

    if (arg === '--target') {
      const value = requireOptionValue(args, index, '--target');
      if (typeof value !== 'string') {
        return value;
      }

      options.options.targetVersion = value;
      index += 1;
      continue;
    }

    if (arg === '--run-id') {
      const value = requireOptionValue(args, index, '--run-id');
      if (typeof value !== 'string') {
        return value;
      }

      options.options.runId = value;
      index += 1;
      continue;
    }

    if (arg.startsWith('--')) {
      return {
        kind: 'error',
        message: `Unknown prepare option: ${arg}`,
        exitCode: 2,
      };
    }

    options.options.packages.push(arg);
  }

  if (options.options.packages.length === 0) {
    return {
      kind: 'error',
      message: 'prepare requires at least one package argument',
      exitCode: 2,
    };
  }

  return options;
}

/**
 * Parses argv-style tokens into a command, options, or a structured error.
 *
 * @param args - Typically `process.argv.slice(2)`; first token is the subcommand when present.
 * @returns Parsed CLI command describing help, version, prepare execution, placeholder commands, or a usage error.
 */
export function parseCliArgs(args: string[]): ParsedCliCommand {
  if (args.length === 0 || args[0] === '--help') {
    return { kind: 'help' };
  }

  if (args[0] === '--version') {
    return { kind: 'version' };
  }

  const commandName = args[0];
  const rest = args.slice(1);

  if (commandName === 'prepare') {
    return parsePrepareArgs(rest);
  }

  if (commandName !== undefined && PLACEHOLDER_COMMANDS.has(commandName)) {
    return {
      kind: 'placeholder',
      commandName,
    };
  }

  return {
    kind: 'error',
    message: `Unknown command: ${commandName ?? '<missing>'}`,
    exitCode: 2,
  };
}

/**
 * Dispatches a parsed CLI invocation and returns process-style streams and exit code.
 *
 * @param args - Same shape as {@link parseCliArgs}.
 * @returns Captured stdout/stderr and exit code suitable for tests or embedding.
 */
export async function runCli(
  args: string[],
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const parsed = parseCliArgs(args);

  if (parsed.kind === 'help') {
    return {
      exitCode: 0,
      stdout: `${getCliHelp()}\n\n${getPrepareHelp()}\n`,
      stderr: '',
    };
  }

  if (parsed.kind === 'version') {
    const version = await readPackageVersion();

    return {
      exitCode: 0,
      stdout: `${version}\n`,
      stderr: '',
    };
  }

  if (parsed.kind === 'prepare') {
    const result = await runPrepareCommand(parsed.options);
    return {
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: '',
    };
  }

  if (parsed.kind === 'placeholder') {
    return {
      exitCode: 1,
      stdout: '',
      stderr: `${parsed.commandName} is not implemented yet\n`,
    };
  }

  return {
    exitCode: parsed.exitCode,
    stdout: '',
    stderr: `${parsed.message}\n`,
  };
}

if (import.meta.main) {
  const result = await runCli(process.argv.slice(2));
  if (result.stdout.length > 0) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }
  process.exit(result.exitCode);
}

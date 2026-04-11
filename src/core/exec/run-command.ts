/** Completed subprocess outcome including timeout flag and captured streams. */
export type CommandResult = {
  command: string[];
  cwd: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

/**
 * Spawns a command with Bun, optional working directory and timeout; reads stdout/stderr fully.
 *
 * On timeout, the process is killed and `exitCode` is `null` with `timedOut` set.
 *
 * @param command - Executable and arguments to spawn.
 * @param options - Optional cwd, timeout, and environment overrides.
 * @returns Completed subprocess result including trimmed output and timeout state.
 */
export async function runCommand(
  command: string[],
  options: {
    cwd?: string;
    timeoutMs?: number;
    env?: Record<string, string | undefined>;
  } = {},
): Promise<CommandResult> {
  const cwd = options.cwd ?? process.cwd();
  const subprocess = Bun.spawn(command, {
    cwd,
    env: {
      ...process.env,
      ...options.env,
    },
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  });

  let timedOut = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const exitCode = await Promise.race([
    subprocess.exited,
    new Promise<number | null>((resolve) => {
      if (options.timeoutMs === undefined) {
        return;
      }

      timeoutHandle = setTimeout(() => {
        timedOut = true;
        subprocess.kill();
        resolve(null);
      }, options.timeoutMs);
    }),
  ]);

  if (timeoutHandle !== undefined) {
    clearTimeout(timeoutHandle);
  }

  if (timedOut) {
    await subprocess.exited;
  }

  const [stdout, stderr] = await Promise.all([
    new Response(subprocess.stdout).text(),
    new Response(subprocess.stderr).text(),
  ]);

  return {
    command,
    cwd,
    exitCode,
    stdout: stdout.trimEnd(),
    stderr: stderr.trimEnd(),
    timedOut,
  };
}

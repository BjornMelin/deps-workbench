# CLI Reference

## Runtime posture

- Bun-native single-package repository
- CLI-first core
- OpenAI-first analysis runtime in later phases
- No Turborepo, monorepo split, or Vercel template in v1

## Canonical command surface

- `prepare`: deterministic evidence collection only
- `analyze`: analysis over an existing prep bundle only
- `report`: compact rendering only
- `run`: end-to-end operator entrypoint
- `resume`: inspect and intentionally continue prior work

## Source layout

- `src/cli.ts` - CLI entrypoint
- `src/commands/` - command handlers
- `src/core/` - collectors, storage, runtime, reporting, policy
- `src/schemas/` - Zod contracts
- `test/` - fixture-backed Bun tests
- `fixtures/` - stable test fixtures
- `config/` - checked-in policy defaults

## Local runtime state

- `.local/runs/` - run-specific state
- `.local/cache/` - reusable cached artifacts
- `.local/config/` - operator-local config

## Current developer commands

```bash
bun run dev
bun run test
bun run typecheck
bun run check
```

## Bootstrap rule

The canonical bootstrap path is a hard cut to:

```bash
bun init --yes
```

Do not preserve alternate template exploration in the implementation docs. The
research phase is complete and Bun bootstrap is the chosen baseline.

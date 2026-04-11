# CLI Reference

## Runtime posture

- Bun-native single-package repository
- CLI-first core
- OpenAI-first analysis runtime with a live `analyze` command
- No Turborepo, monorepo split, or Vercel template in v1
- Bundled skills live alongside the repo, but do not belong to the runtime CLI
  command surface

## Canonical command surface

- `prepare`: deterministic evidence collection only
- `analyze`: analysis over an existing prep bundle only
- `report`: compact rendering only
- `run`: end-to-end operator entrypoint
- `resume`: inspect and intentionally continue prior work

## Current command status

- implemented: `prepare`, `analyze`
- planned next: `report`, `run`, `resume`

## Analyze behavior

- `analyze` consumes an existing prep bundle only; it does not recollect prep
  evidence.
- The initial model tier comes from policy-based routing over the prepared
  bundle.
- One automatic escalation retry is allowed only for `implementation` mode, and
  only when the routed score reaches `recoveryEscalationMin` and uncertainty
  signals still justify it.
- Recovery metadata reports whether escalation actually resolved uncertainty,
  not just whether a second model call happened.
- Analyze synthesis is consumed as schema-typed agent output, not best-effort
  free-form JSON text parsing.

## Source layout

- `src/cli.ts` - CLI entrypoint
- `src/commands/` - command handlers
- `src/core/` - collectors, storage, runtime, reporting, policy
- `src/schemas/` - Zod contracts
- `test/` - fixture-backed Bun tests
- `fixtures/` - stable test fixtures
- `config/` - checked-in policy defaults
- `skills/` - bundled-skills source-of-truth lane

## Local runtime state

- `.local/runs/` - run-specific state
- `.local/cache/` - reusable cached artifacts
- `.local/config/` - operator-local config

## Current developer commands

```bash
bun run biome:check
bun run biome:write
bun run biome:ci
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

# AGENTS.md

`deps-workbench` is a Bun-native CLI-first repository. Treat this file as the
operator contract for implementation sessions in this repo.

## Default posture

- Prefer Bun-native TypeScript and Bun Shell utilities.
- Keep one canonical implementation path; do not add compatibility layers.
- Use `AGENTS.md`, not `CLAUDE.md`, as the repo-local agent contract.
- Keep runtime state under `.local/`; do not commit operator runs or caches.
- Keep checked-in policy in `config/deps-workbench.config.jsonc`.
- Keep docs lean and authoritative; avoid duplicate planning fragments.

## Execution routing

1. Start with [docs/plan/README.md](docs/plan/README.md).
2. Open the first incomplete numbered phase unless the task explicitly targets
   a later phase.
3. Read the phase doc before editing.
4. Implement only the scoped slice for that phase.
5. Run the phase verification commands before marking it done.
6. Update the phase-local status and master plan ledger in the same change.

## Canonical command roles

- `prepare`: deterministic local evidence collection only
- `analyze`: model-driven analysis over a prepared artifact bundle only
- `report`: compact rendering of prep or result bundles only
- `run`: end-to-end convenience entrypoint
- `resume`: inspect and intentionally continue a prior run

Do not blur these boundaries during implementation.

## Authority docs

- Repo overview: [README.md](README.md)
- Docs index: [docs/README.md](docs/README.md)
- Product requirements: [docs/prd.md](docs/prd.md)
- Requirements index: [docs/requirements-index.md](docs/requirements-index.md)
- Planning authority: [docs/plan/README.md](docs/plan/README.md)
- CLI reference: [docs/references/cli-reference.md](docs/references/cli-reference.md)
- Operator runbook: [docs/runbooks/implementation-workflow.md](docs/runbooks/implementation-workflow.md)

## Runtime and storage rules

- `.local/runs/` holds run-specific state
- `.local/cache/` holds content-addressed reusable artifacts
- `.local/config/` holds local operator overrides that must stay untracked
- `config/` holds checked-in policy and routing defaults
- `src/schemas/` is the contract source of truth

## Verification contract

- Keep the repo buildable with Bun-only commands.
- Prefer fixture-backed tests over live network checks.
- Stop if a phase requires a new architecture branch not covered by the master
  planning index.
- Before marking a phase done, run its declared verification commands and
  record the real outcome in the plan docs.

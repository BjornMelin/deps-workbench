# AGENTS.md

`deps-workbench` is a Bun-native CLI-first repository. This file is the repo
contract for implementation sessions.

## Core posture

- Prefer Bun-native TypeScript and Bun Shell utilities.
- Keep one canonical implementation path; do not add compatibility layers.
- Use `AGENTS.md`, not `CLAUDE.md`, as the repo-local contract.
- Keep runtime state under `.local/`; do not commit runs, cache, or operator
  local overrides.
- Keep checked-in policy in `config/deps-workbench.config.jsonc`.
- Keep docs lean at the top level, but make each numbered phase file in
  `docs/plan/` near-standalone and execution-capable.
- Treat the plan docs as an operator control plane, not as lightweight notes.

## Routing and execution order

1. Start with [docs/plan/README.md](docs/plan/README.md).
2. Open the first incomplete numbered phase unless the task explicitly targets a
   later phase.
3. Read the phase doc before editing.
4. Respect the phase persona, scope, anti-goals, and stop rules.
5. Implement only the scoped vertical slice.
6. Run the declared verification commands before updating status.
7. Update the phase-local status and the master plan ledger in the same change.
8. If behavior, architecture, or operator workflow changes, update the linked
   authority docs in the same change.

## Canonical command roles

- `prepare`: deterministic local evidence collection only
- `analyze`: model-driven analysis over a prepared artifact bundle only
- `report`: compact rendering of prep or result bundles only
- `run`: end-to-end convenience entrypoint
- `resume`: inspect and intentionally continue a prior run

Do not blur these command boundaries during implementation.

## Bundled skills rules

- Top-level `skills/` is the future source of truth for package-coupled skills.
- Installed copies in `~/.agents/skills` are mirrors only.
- Edit bundled skills in this repo, not in installed copies.
- Install and sync flows should wrap the standard `skills` CLI instead of
  inventing a parallel installer.
- Bundled skills are versioned separately from runtime package releases, even
  though they live in the same git repo.

## Authority docs

- Repo overview: [README.md](README.md)
- Docs index: [docs/README.md](docs/README.md)
- Product requirements: [docs/prd.md](docs/prd.md)
- Requirements index: [docs/requirements-index.md](docs/requirements-index.md)
- Architecture reference: [docs/references/repo-architecture.md](docs/references/repo-architecture.md)
- Bundled skills reference: [docs/references/bundled-skills.md](docs/references/bundled-skills.md)
- Release automation reference: [docs/references/release-automation.md](docs/references/release-automation.md)
- CLI reference: [docs/references/cli-reference.md](docs/references/cli-reference.md)
- Implementation runbook: [docs/runbooks/implementation-workflow.md](docs/runbooks/implementation-workflow.md)
- Planning authority: [docs/plan/README.md](docs/plan/README.md)

## Runtime and storage rules

- `.local/runs/` holds run-specific state
- `.local/cache/` holds reusable cached artifacts
- `.local/config/` holds operator-local overrides that remain untracked
- `config/` holds checked-in policy and routing defaults
- `src/schemas/` is the contract source of truth
- `skills/` is the bundled-skills source-of-truth lane

## Verification contract

- Keep the repo buildable with Bun-only commands.
- Prefer fixture-backed tests over live network gates.
- Stop if a phase requires a new architecture branch not covered by the master
  planning index.
- Stop if a change would mix runtime and bundled-skills distribution concerns in
  a way that breaks the locked release split.
- Before marking a phase done, run the declared verification commands and record
  the real result in the plan docs.

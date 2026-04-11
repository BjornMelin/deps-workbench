# AGENTS.md

`deps-workbench` is a Bun-native CLI-first repository. This file is the repo
contract for implementation sessions.

## Core posture

- Prefer Bun-native TypeScript and Bun Shell utilities.
- Keep one canonical implementation path; do not add compatibility layers.
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
- Default gate before finishing work: `bun run prepare` (see **Commands**).

## Commands

From repo root: `bun run <script>`; `biome` and `tsc` come from `node_modules`.

```sh
bun run check # biome:ci + typecheck + test; default verification
bun run biome:ci # Biome CI check, no writes (CI biome job)
bun run biome:write # format + safe lint fixes; biome.json file scope
bun run biome:write:staged # manual staged-file check/write; not partial-staging safe
bun run hook:pre-commit-format # formats staged blobs via Bun before .husky/pre-commit checks
bun run typecheck # tsc --noEmit
bun run test # bun test
bun run dev # CLI: src/cli.ts
bun run start # same as dev
bun run prepare # Husky hooks; also runs on bun install
# .husky/pre-commit: hook:pre-commit-format, typecheck, test
HUSKY=0 git commit # commit once with hooks off
git commit --no-verify # skip hooks for this commit
```

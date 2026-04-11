# deps-workbench

`deps-workbench` is a Bun-native TypeScript CLI for deterministic dependency
upgrade preparation, structured artifact generation, and implementation-driving
analysis.

The repo is intentionally being built in a plan-first, execution-safe way. The
current state is not "generic Bun starter plus future intentions". It is a
repo with an explicit product contract, an execution ledger, and a documented
architecture that future Codex sessions can use without rediscovering the
system design.

## What this repo is for

`deps-workbench` exists to reduce repeated discovery cost in dependency upgrade
work. Instead of asking an interactive Codex session to repeatedly:

- rediscover package versions and upgrade targets
- re-collect release notes, docs, usage hotspots, and source diffs
- re-decide whether an upgrade is low-risk, review-heavy, or blocked
- re-summarize migration work from scratch

this repo will provide a deterministic prep phase plus a bounded analysis phase
that yields typed artifacts, typed results, and action-oriented manifests.

## Current status

- [done] Repo scaffold and authority docs are in place
- [done] Phase 01 bootstrap foundation is verified complete
- [done] Phase 02 typed contracts, storage, and policy loading
- [done] Phase 03 deterministic prep collectors and prep bundles
- [done] Phase 04 analysis runtime, routing, and canonical result bundles
- [todo] Phase 05 reporting, run, and resume operator flows
- [todo] Phase 06 bundled-skills ownership, release automation, migration, and
  release readiness

## Product shape

The canonical v1 design is:

- Bun-native single-package repository
- CLI-first core with the command surface:
  - `prepare`
  - `analyze`
  - `report`
  - `run`
  - `resume`
- JSON-first prep bundles and result bundles
- Zod as the source of truth for checked-in contracts
- OpenAI Agents JS SDK for the analysis runtime
- conservative model routing with implementation-only bounded recovery
- hidden `.local/` runtime state for runs, cache, and local overrides
- top-level `skills/` as the future source of truth for package-coupled skills

## Bundled skills

This repo will own the source of truth for the package-coupled skills that
depend directly on `deps-workbench` command contracts and artifact shapes.

Planned bundled skills:

- `deps-workbench`
- `opensrc-inspect`
- `repo-modernize-upgrade-audit`

Those skills will be tracked in-repo under `skills/`, versioned separately from
runtime package releases, and installed outward into agent skill directories via
repo-documented wrappers around the standard `skills` CLI.

## Quick start

```bash
bun install
bun run biome:write
bun run biome:ci
bun run dev prepare --request "upgrade react to latest" --package react
bun run dev analyze --run-id <run-id>
bun run dev
bun run test
bun run typecheck
bun run check
```

The CLI now has real `prepare` and `analyze` commands. `report`, `run`, and
`resume` remain phased placeholders. The execution authority for all real work
is the planning index:
[docs/plan/README.md](docs/plan/README.md).

## Docs and authority

- Operator contract: [AGENTS.md](AGENTS.md)
- Docs index: [docs/README.md](docs/README.md)
- Product framing: [docs/prd.md](docs/prd.md)
- Requirements index: [docs/requirements-index.md](docs/requirements-index.md)
- Architecture reference: [docs/references/repo-architecture.md](docs/references/repo-architecture.md)
- Bundled skills reference: [docs/references/bundled-skills.md](docs/references/bundled-skills.md)
- Release automation reference: [docs/references/release-automation.md](docs/references/release-automation.md)
- Execution plans: [docs/plan/README.md](docs/plan/README.md)

## License

Apache-2.0. See [LICENSE](LICENSE).

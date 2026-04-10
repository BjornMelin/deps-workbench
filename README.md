# deps-workbench

`deps-workbench` is a Bun-native TypeScript CLI for deterministic dependency
upgrade prep, artifact generation, and implementation-driving analysis.

The repo is in active buildout. The planning system, authority docs, and repo
scaffold are checked in first so future Codex sessions can execute the work in
bounded, verifiable phases instead of rediscovering architecture each time.

## Current status

- [done] Bun bootstrap completed
- [done] Formal repo scaffolding and planning docs checked in
- [todo] Core schemas, storage, and policy loading
- [todo] Deterministic prep collectors and artifact bundle generation
- [todo] OpenAI analysis runtime and result bundle generation
- [todo] Reporting, resume flow, and release readiness

## Intended shape

- Bun-native single-package repository
- Canonical CLI commands: `prepare`, `analyze`, `report`, `run`, `resume`
- OpenAI Agents JS SDK for analysis and orchestration
- File-backed JSON artifact bundles and result bundles
- Zod-validated contracts and checked-in policy configuration
- Hidden `.local/` runtime state for runs, cache, and local operator config

## Quick start

```bash
bun install
bun run dev
bun run test
bun run typecheck
```

The CLI is still a placeholder until the first implementation phases land. Use
[docs/plan/README.md](docs/plan/README.md) as the execution authority for the
buildout sequence.

## Repo guide

- Operator contract: [AGENTS.md](AGENTS.md)
- Docs index: [docs/README.md](docs/README.md)
- Product framing: [docs/prd.md](docs/prd.md)
- Requirements index: [docs/requirements-index.md](docs/requirements-index.md)
- Execution plans: [docs/plan/README.md](docs/plan/README.md)

## License

Apache-2.0. See [LICENSE](LICENSE).

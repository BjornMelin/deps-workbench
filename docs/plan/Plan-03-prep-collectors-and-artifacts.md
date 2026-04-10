# Plan 03 - prep-collectors-and-artifacts

## Goal

Implement deterministic prep collectors, prerequisite checks, and canonical prep
artifact bundle writing for dependency-upgrade analysis.

## Status

- [todo] Not started

## Locked decisions

- `prepare` owns deterministic local evidence collection only
- prep output is JSON-first with typed artifacts plus a manifest
- token optimization comes from compact rendering, not dropping raw JSON
- `opensrc`, `bun`, `ctx7`, and `gh` are the expected external collector inputs

## Files and areas

- `src/commands/prepare.ts`
- `src/core/preflight/**`
- `src/core/collectors/**`
- `src/core/prep/**`
- `src/schemas/**`
- `fixtures/**`
- `test/**`

## Steps

1. Implement external tool preflight checks.
2. Implement collector wrappers for Bun, opensrc, ctx7 docs, and GitHub data.
3. Assemble the canonical prep artifact bundle and manifest.
4. Add fixture-backed tests for bundle generation and degraded-source behavior.

## Verification

```bash
bun run typecheck
bun run test
```

## Stop rules

- Stop if `prepare` starts doing analysis or synthesis work.
- Stop if the prep bundle loses traceability back to source artifacts.

## Resume notes

- Phase 02 contracts and storage helpers should exist first.
- Keep collector outputs typed and source-labeled.

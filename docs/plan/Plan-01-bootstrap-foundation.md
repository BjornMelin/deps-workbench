# Plan 01 - bootstrap-foundation

## Phase mission

Replace the generic Bun bootstrap output with the canonical repo scaffold,
authority docs, ignored runtime-state policy, bundled-skills metadata lane, and
a minimal verifiable CLI/test placeholder.

This phase exists so every later phase starts from a repo that already has the
correct identity, docs contract, and local verification path.

## Phase status

- [done] Bun bootstrap completed
- [done] Repo directories created
- [done] Authority docs drafted
- [done] Placeholder CLI and test scaffolded
- [done] Bundled-skills metadata lane scaffolded
- [done] Verification passed `bun run typecheck` and `bun run test`
- [done] Master ledger updated to reflect completion

## Custom execution persona

### Persona name

Foundation Steward

### Persona mission

Establish the repo identity, boundaries, and execution control plane with the
smallest viable runtime placeholder and the strongest possible clarity.

### Persona biases

- prefer structural clarity over premature implementation depth
- make operator rules explicit rather than implied
- create the minimum runtime placeholder needed for verification

### Persona anti-goals

- do not start implementing real command logic
- do not introduce extra libraries or tooling just because the repo is empty
- do not leave bootstrap docs generic or template-flavored

## Why this phase matters

If this phase is weak, later implementation phases drift immediately because the
repo lacks a stable execution contract. This phase is the baseline that every
other plan depends on.

## Preconditions

- repository exists
- Bun bootstrap can run locally
- no later phase work should be attempted first

## Locked decisions for this phase

- CLI-first single-package repo
- `bun init --yes` is the bootstrap baseline
- `AGENTS.md` is the repo contract; `CLAUDE.md` must not remain
- `.local/` holds runtime state and stays untracked
- docs are public-ready and Apache-2.0 aligned
- `skills/` metadata lane exists before actual skill import work

## In scope

- top-level repo identity files
- docs authority skeleton
- plan system bootstrap
- placeholder CLI and placeholder test
- bundled-skills metadata lane scaffold

## Out of scope

- real prep collectors
- real analysis runtime
- release automation implementation
- importing actual skill folders

## Deliverables

- formal `README.md`
- formal `AGENTS.md`
- `.gitignore`
- `LICENSE`
- placeholder `src/cli.ts`
- placeholder `test/cli.test.ts`
- authority docs and planning docs
- top-level `skills/` metadata lane

## Task ledger

### Identity and contract

- [x] replace generic Bun README with repo-specific README
- [x] create repo-local `AGENTS.md`
- [x] remove `CLAUDE.md`
- [x] add Apache-2.0 `LICENSE`
- [x] set package metadata and Bun scripts in `package.json`
- [x] tighten `tsconfig.json` to Bun-native strict TypeScript

### Repo structure

- [x] create `src/`
- [x] create `test/`
- [x] create `fixtures/`
- [x] create `config/`
- [x] create `docs/` structure
- [x] create `skills/` metadata lane

### Placeholder runtime

- [x] add placeholder CLI entrypoint
- [x] add minimal passing Bun test
- [x] keep runtime intentionally thin and non-misleading

### Planning system bootstrap

- [x] create master planning index
- [x] create numbered phase files
- [x] create prompt templates
- [x] verify that Phase 01 status is written back after gates pass

## Execution notes

- Bun bootstrap placeholder files were replaced rather than layered on.
- `skills/` metadata was scaffolded early so later bundled-skill ownership work
  has a real tracked lane.

## Verification

```bash
bun run typecheck
bun run test
```

## Verification record

- [x] `bun run typecheck`
- [x] `bun run test`

## Completion criteria

This phase is complete only if:

- the repo no longer looks like a generic Bun starter
- docs and plans are in place
- the placeholder CLI and test pass
- Phase 01 is marked done both here and in the master ledger

## Stop rules

- Stop if the repo can no longer be bootstrapped with Bun-only commands.
- If README, AGENTS, and the planning index diverge on core architecture, stop.

## Resume rules

- Reopen the master planning index first.
- If verification already passed, do not redo this phase unless a later phase
  required foundation changes.

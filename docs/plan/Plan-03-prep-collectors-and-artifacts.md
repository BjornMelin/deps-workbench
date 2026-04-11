# Plan 03 - prep-collectors-and-artifacts

## Phase mission

Implement deterministic prep collectors, prerequisite checks, and canonical prep
artifact bundle writing for dependency-upgrade analysis.

This phase should gather high-value evidence once, in a typed and inspectable
form, before any model synthesis begins.

## Phase status

- [done] Verified complete

## Custom execution persona

### Persona name

Evidence Harvester

### Persona mission

Build the deterministic collection layer that turns repo/package facts into a
canonical prep bundle with strong provenance and predictable rerun behavior.

### Persona biases

- prefer explicit provenance over convenience
- gather only what improves later correctness or routing
- keep collectors deterministic and source-labeled

### Persona anti-goals

- do not perform synthesis or migration reasoning here
- do not collapse raw evidence into markdown-only output
- do not bury source-family failures

## Why this phase matters

If prep is weak, the analysis lane becomes expensive and unreliable. This phase
creates the reusable evidence that makes later runs cheaper and more trustworthy.

## Preconditions

- Phase 02 contracts and storage helpers must be complete
- checked-in policy loading must exist

## Locked decisions for this phase

- `prepare` owns deterministic local evidence collection only
- prep output is JSON-first with typed artifacts plus a manifest
- token optimization comes from compact rendering, not dropping raw JSON
- `opensrc`, `bun`, `ctx7`, and `gh` are expected external collector inputs
- artifact reuse uses content-addressed caching plus run IDs

## In scope

- external tool preflight checks
- collector wrappers
- prep artifact bundle assembly
- degraded-source recording
- fixture-backed tests around bundle generation

## Out of scope

- model routing
- synthesis
- result bundle generation
- operator rendering beyond what prep needs to serialize
- bundled skill import work

## Required context before editing

Read before implementation:

- `AGENTS.md`
- `docs/plan/README.md`
- `docs/references/repo-architecture.md`
- `docs/references/cli-reference.md`
- `docs/references/bundled-skills.md`
- the Phase 02 output files

## Target file areas

- `src/commands/prepare.ts`
- `src/core/preflight/**`
- `src/core/collectors/**`
- `src/core/prep/**`
- `src/schemas/**`
- `fixtures/**`
- `test/**`

## Deliverables

- preflight checks for required external CLIs
- collector wrappers for Bun, opensrc, ctx7 docs, and GitHub metadata
- canonical prep artifact bundle writer
- prep manifest generation
- explicit degraded-mode recording for missing artifact families
- fixture-backed tests proving bundle shape and collector integration seams

## Task ledger

### Preflight

- [x] implement external CLI availability checks
- [x] classify required vs optional failures clearly
- [x] report missing tool families in a structured way

### Collectors

- [x] implement Bun signal collection wrapper(s)
- [x] implement opensrc source-resolution wrapper(s)
- [x] implement ctx7 documentation collection wrapper(s)
- [x] implement GitHub release/changelog metadata wrapper(s)
- [x] keep collector outputs typed and source-labeled

### Bundle assembly

- [x] define prep bundle writer flow
- [x] write canonical `manifest.json`
- [x] write canonical artifact family files
- [x] ensure bundle provenance points back to source families
- [x] record degraded state without pretending success

### Caching and identity

- [x] use run IDs for traceability
- [x] use content-addressed reuse where inputs match
- [x] keep freshness and invalidation behavior explicit in prep metadata

### Testing

- [x] add fixture-backed prep bundle generation tests
- [x] add tests for degraded-source behavior
- [x] add tests that collector outputs match schema expectations

## Execution notes

- [x] Added a real `prepare` command with typed CLI parsing and manifest-first output.
- [x] Implemented Bun-native preflight checks, workspace scanning, collector wrappers, content-addressed cache reuse, and canonical prep artifact writing.
- [x] Added fixture repos and test coverage for bundle generation, degraded-mode recording, and cache reuse.

## Blockers

- [x] none recorded

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

- `prepare` can emit a canonical typed prep bundle
- collector provenance is explicit
- missing source families are surfaced structurally
- prep remains deterministic and non-synthetic
- the phase and master ledger are updated together

## Stop rules

- Stop if `prepare` starts doing synthesis or migration reasoning.
- Stop if the prep bundle loses traceability back to source artifacts.
- Stop if caching hides whether evidence is fresh or reused.

## Resume rules

- Confirm Phase 02 outputs exist before starting.
- Keep collector outputs raw enough for later model reasoning.
- Record source-family failures explicitly rather than summarizing them away.

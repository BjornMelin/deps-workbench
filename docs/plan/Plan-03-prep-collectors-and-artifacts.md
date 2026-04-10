# Plan 03 - prep-collectors-and-artifacts

## Phase mission

Implement deterministic prep collectors, prerequisite checks, and canonical prep
artifact bundle writing for dependency-upgrade analysis.

This phase should gather high-value evidence once, in a typed and inspectable
form, before any model synthesis begins.

## Phase status

- [todo] Not started

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

- [ ] implement external CLI availability checks
- [ ] classify required vs optional failures clearly
- [ ] report missing tool families in a structured way

### Collectors

- [ ] implement Bun signal collection wrapper(s)
- [ ] implement opensrc source-resolution wrapper(s)
- [ ] implement ctx7 documentation collection wrapper(s)
- [ ] implement GitHub release/changelog metadata wrapper(s)
- [ ] keep collector outputs typed and source-labeled

### Bundle assembly

- [ ] define prep bundle writer flow
- [ ] write canonical `manifest.json`
- [ ] write canonical artifact family files
- [ ] ensure bundle provenance points back to source families
- [ ] record degraded state without pretending success

### Caching and identity

- [ ] use run IDs for traceability
- [ ] use content-addressed reuse where inputs match
- [ ] keep freshness and invalidation behavior explicit in prep metadata

### Testing

- [ ] add fixture-backed prep bundle generation tests
- [ ] add tests for degraded-source behavior
- [ ] add tests that collector outputs match schema expectations

## Execution notes

- [ ] add notes here as implementation proceeds

## Blockers

- [ ] none recorded yet

## Verification

```bash
bun run typecheck
bun run test
```

## Verification record

- [ ] `bun run typecheck`
- [ ] `bun run test`

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

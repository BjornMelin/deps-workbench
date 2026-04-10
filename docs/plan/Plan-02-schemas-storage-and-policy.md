# Plan 02 - schemas-storage-and-policy

## Phase mission

Create the typed foundation for the rest of the repo: Zod contracts, `.local/`
path and storage helpers, checked-in policy loading, and validation tests.

This phase should make it impossible for later phases to invent parallel schema
shapes, storage roots, or hidden policy defaults.

## Phase status

- [done] Base Zod schemas implemented for prep, result, enums, and policy
- [done] `.local/` path and directory helpers implemented
- [done] Checked-in policy loading and validation implemented
- [done] Fixture-backed schema, policy, and storage tests added
- [done] Verification passed `bun run typecheck` and `bun run test`
- [done] Master ledger updated to reflect completion

## Custom execution persona

### Persona name

Contract Architect

### Persona mission

Define the canonical runtime and artifact contracts so later prep, analysis,
and operator flows all build on one typed foundation.

### Persona biases

- prefer explicit Zod contracts over ad hoc TypeScript-only shapes
- make path ownership and local-state boundaries obvious
- fail fast on invalid checked-in policy

### Persona anti-goals

- do not implement collectors or analysis logic yet
- do not add hidden env-based policy branching
- do not duplicate contract shapes across modules

## Why this phase matters

Every later phase depends on stable contracts and storage ownership. If this
phase is weak, later phases will duplicate interfaces and drift immediately.

## Preconditions

- Phase 01 must be complete
- authority docs and planning system must already exist

## Locked decisions for this phase

- Zod is the source of truth for checked-in contracts
- runtime state lives under `.local/`
- checked-in policy lives in `config/deps-workbench.config.jsonc`
- config validation happens at load time, not later in the pipeline
- prep and result bundles are JSON-first contracts

## In scope

- base Zod schemas for manifests and policy
- `.local/` path helpers and storage utilities
- checked-in policy loader and validation path
- tests for schema and storage behavior

## Out of scope

- external tool collectors
- OpenAI runtime wiring
- reporting logic
- release automation
- actual bundled skill content

## Required context before editing

Read before implementation:

- `AGENTS.md`
- `docs/plan/README.md`
- `docs/references/repo-architecture.md`
- `docs/references/cli-reference.md`
- `config/deps-workbench.config.jsonc`

## Target file areas

- `src/schemas/**`
- `src/core/storage/**`
- `src/core/policy/**`
- `config/deps-workbench.config.jsonc`
- `test/**`
- `fixtures/**`

## Deliverables

- base schema modules for prep manifests
- base schema modules for result manifests
- schema for outcome classes and primary actions
- schema for policy/config file
- `.local/` path helper utilities
- local JSON and JSONC readers
- tests covering schema acceptance/rejection and path construction

## Task ledger

### Schema design

- [x] define the canonical prep manifest schema
- [x] define prep artifact family schemas and references
- [x] define the canonical result manifest schema
- [x] define enums or literals for outcome classes
- [x] define enums or literals for primary actions
- [x] define confidence-adjacent result structures and unverified surfaces
- [x] define the checked-in policy/config schema
- [x] keep schemas under `src/schemas/` as the single source of truth

### Storage and paths

- [x] define the canonical `.local/` path layout in code
- [x] implement helpers for `.local/runs`
- [x] implement helpers for `.local/cache`
- [x] implement helpers for `.local/config`
- [x] ensure helpers reject paths that escape the repo root

### Policy loading

- [x] implement checked-in policy loading from `config/`
- [x] validate config at load time with operator-facing errors
- [x] keep local override plumbing out of scope in this phase
- [x] avoid env-driven hidden defaults

### Testing

- [x] add fixture-backed schema validation tests
- [x] add rejection tests for invalid policy values
- [x] add storage path tests for `.local/` helpers
- [x] verify there is one contract source of truth per shape

## Execution notes

- Added runtime dependencies: `zod` and `jsonc-parser`.
- Implemented canonical base schemas for prep/result manifests and policy.
- Added local-state path helpers plus JSON/JSONC read helpers.
- Added fixture-backed tests for schema acceptance, invalid policy rejection,
  and path safety.

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

- later phases can import typed schemas instead of inventing shapes
- storage roots are explicit and repo-local
- checked-in policy is validated at load time
- tests prove both happy-path and invalid-path behavior
- the master ledger and this phase file are updated together

## Stop rules

- Stop if policy loading requires environment-driven hidden defaults.
- Stop if contracts are duplicated outside `src/schemas/`.
- Stop if any helper starts pulling in collector or analysis behavior.

## Resume rules

- Confirm Phase 01 is done before starting.
- Reuse the checked-in config file instead of introducing parallel defaults.
- Record all execution notes and blockers in this file before finalizing.

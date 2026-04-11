# Plan 05 - reporting-resume-and-operator-surface

## Phase mission

Implement the compact operator-facing surface for reporting, end-to-end runs,
and resume workflows without breaking the clean command boundaries.

This phase should make the system usable as an operator tool, not just as an
internal runtime with hidden JSON files.

## Phase status

- [todo] Not started

## Custom execution persona

### Persona name

Operator Experience Engineer

### Persona mission

Turn the prep and analysis internals into a compact, reliable, inspectable
operator surface while preserving all the architectural boundaries established in
earlier phases.

### Persona biases

- prefer compact default output
- make continuation and resume state explicit
- preserve manifest-first operator flow

### Persona anti-goals

- do not duplicate the analysis implementation inside `run`
- do not silently rerun expensive work from `resume`
- do not default to giant markdown blobs

## Why this phase matters

Without this phase, the system may be technically correct but still expensive to
operate because humans and primary Codex sessions would need to read too much or
reconstruct state manually.

## Preconditions

- Phase 04 result bundle contracts must exist
- Phase 03 prep bundles must already be readable and stable

## Locked decisions for this phase

- `report` renders both prep and result bundles
- compact output is the default
- `run` defaults to `implementation` mode
- `resume` is inspect-and-decide by default
- no silent mode switching; recommendations stay explicit
- operator flow is manifest-first selective loading

## In scope

- `report` implementation
- `run` orchestration wrapper
- `resume` implementation
- compact operator renderers and status views
- tests for the operator surface

## Out of scope

- changing routing logic from Phase 04 beyond required integration
- release automation implementation
- importing bundled skill content

## Required context before editing

Read before implementation:

- `AGENTS.md`
- `docs/plan/README.md`
- `docs/references/repo-architecture.md`
- `docs/runbooks/implementation-workflow.md`
- Phase 03 and 04 outputs

## Target file areas

- `src/commands/report.ts`
- `src/commands/run.ts`
- `src/commands/resume.ts`
- `src/core/reporting/**`
- `src/core/resume/**`
- `test/**`

## Deliverables

- prep/result compact renderers
- run orchestration entrypoint
- resume inspection and intentional continuation flow
- manifest-driven operator summaries
- tests covering output modes and resume behavior

## Task ledger

### Reporting

- [ ] implement compact prep bundle renderer
- [ ] implement compact result bundle renderer
- [ ] support explicit raw JSON output mode
- [ ] support explicit fuller output mode without changing the default

### Run

- [ ] implement `run` as orchestration over existing phase components
- [ ] keep command responsibilities clean
- [ ] ensure mode defaults to `implementation`
- [ ] ensure mode changes depth, not architecture

### Resume

- [ ] implement prior-run inspection flow
- [ ] implement explicit follow-recommendation behavior
- [ ] avoid silent reruns or silent escalation
- [ ] show recovery history and current state clearly

### Testing

- [ ] add tests for compact output defaults
- [ ] add tests for manifest-first operator flow
- [ ] add tests for resume behavior on completed runs
- [ ] add tests for resume behavior on in-flight or recoverable runs

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

- operators can inspect prep and result bundles without raw JSON by default
- `run` feels like orchestration, not a duplicate implementation
- `resume` is explicit and auditable
- the manifest-first selective loading story is preserved end-to-end
- the phase and master ledger are updated together

## Stop rules

- Stop if `run` becomes a second analysis implementation instead of orchestration.
- Stop if `resume` silently reruns expensive work.
- Stop if default output becomes verbose enough to defeat the token-discipline
  goal.

## Resume rules

- Confirm Phase 04 outputs exist first.
- Keep operator output compact and action-oriented by default.
- Record any confusion or friction points directly in this plan as notes.

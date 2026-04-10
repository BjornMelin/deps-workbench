# Plan 04 - analysis-runtime-and-model-routing

## Phase mission

Implement the OpenAI analysis runtime over prepared bundles, including model
routing, bounded recovery, semantic outcome classification, and canonical result
bundle generation.

This phase should turn high-quality prep evidence into an implementation-driving
result bundle without collapsing the clean boundary between deterministic prep
and model synthesis.

## Phase status

- [todo] Not started

## Custom execution persona

### Persona name

Synthesis Orchestrator

### Persona mission

Build the analysis runtime that consumes prepared evidence, routes model work
conservatively, records decisions and recovery, and emits a result bundle the
main Codex session can act on.

### Persona biases

- prefer conservative routing over premature escalation
- partition certainty explicitly
- keep result outputs implementation-driving and machine-usable

### Persona anti-goals

- do not recollect deterministic evidence inside analysis
- do not allow narrative-only outputs to replace structured results
- do not allow multi-hop autonomous retry loops

## Why this phase matters

This phase is where the deterministic collection layer becomes useful operator
leverage. If it is vague or overly narrative, the main Codex session still pays
the same reasoning tax later.

## Preconditions

- Phase 03 prep bundles and manifests must exist
- routing/policy config must be available from Phase 02

## Locked decisions for this phase

- analysis runtime is OpenAI Agents JS SDK based
- provider strategy is OpenAI-first and OpenAI-only in v1
- escalation is conservative: nano -> mini -> full
- one bounded automatic recovery hop with a strict allowlist
- result output is implementation-driving with per-claim confidence and
  explicit `UNVERIFIED`
- outcome classes are explicit and hybrid structural+semantic

## In scope

- prep-bundle ingestion
- structural eligibility checks
- model routing and escalation scoring
- bounded recovery handling
- result bundle generation
- tests for routing and result structure

## Out of scope

- deterministic collector implementation
- operator rendering details beyond result writing
- release automation
- bundled skill install scripts

## Required context before editing

Read before implementation:

- `AGENTS.md`
- `docs/plan/README.md`
- `docs/references/repo-architecture.md`
- `docs/references/release-automation.md`
- Phase 02 and 03 outputs

## Target file areas

- `src/commands/analyze.ts`
- `src/core/runtime/**`
- `src/core/models/**`
- `src/core/results/**`
- `src/schemas/**`
- `test/**`

## Deliverables

- analysis command entrypoint
- prepared-bundle intake and validation
- structural eligibility checks for minimum evidence pillars
- weighted escalation scoring implementation
- bounded recovery recording
- canonical result bundle writer
- tests for routing, recovery, and result contracts

## Task ledger

### Intake and eligibility

- [ ] validate prepared bundle intake against schema
- [ ] implement minimum evidence pillar checks
- [ ] classify structurally degraded or blocked runs before synthesis

### Routing and model policy

- [ ] implement weighted escalation scoring
- [ ] implement conservative routing thresholds
- [ ] implement explicit mode-aware routing behavior
- [ ] keep provider scope OpenAI-only in v1

### Recovery and run recording

- [ ] implement one bounded recovery hop model
- [ ] enforce the strict allowlist
- [ ] record recovery in manifests/result metadata

### Result generation

- [ ] write `result_manifest.json`
- [ ] write `decision_report.json`
- [ ] write `evidence_map.json`
- [ ] write `implementation_checklist.json`
- [ ] write `validation_checklist.json`
- [ ] support optional `open_questions.json`
- [ ] ensure per-claim confidence and `UNVERIFIED` are explicit

### Testing

- [ ] add tests for routing thresholds
- [ ] add tests for blocked/degraded outcome classes
- [ ] add tests for recovery recording
- [ ] add tests for result bundle schema conformance

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

- the runtime consumes prepared bundles instead of recollecting evidence
- routing and recovery are explicit and bounded
- the result bundle is implementation-driving and schema-valid
- outcome class and primary action are present in the result manifest
- the phase and master ledger are updated together

## Stop rules

- Stop if analysis starts performing deterministic prep collection.
- Stop if recovery expands into open-ended retry loops.
- Stop if result output becomes narrative-only instead of implementation-driving.

## Resume rules

- Confirm Phase 03 prep output is stable before starting.
- Preserve manifest-first selective consumption in all result design choices.
- Record every routing or recovery surprise in the execution notes.

# Plan 04 - analysis-runtime-and-model-routing

## Goal

Implement the OpenAI analysis runtime over prepared bundles, including model
routing, bounded recovery, semantic outcome classification, and canonical result
bundle generation.

## Status

- [todo] Not started

## Locked decisions

- analysis runtime is OpenAI Agents JS SDK based
- provider strategy is OpenAI-first and OpenAI-only in v1
- escalation is conservative: nano -> mini -> full
- one bounded automatic recovery hop with a strict allowlist
- result output is implementation-driving with per-claim confidence and
  explicit `UNVERIFIED`

## Files and areas

- `src/commands/analyze.ts`
- `src/core/runtime/**`
- `src/core/models/**`
- `src/core/results/**`
- `src/schemas/**`
- `test/**`

## Steps

1. Implement prep-bundle ingestion and structural eligibility checks.
2. Implement model-routing policy and escalation scoring.
3. Implement bounded recovery handling and run recording.
4. Generate canonical result bundle files and `result_manifest.json`.
5. Add tests for routing, recovery decisions, and result contract generation.

## Verification

```bash
bun run typecheck
bun run test
```

## Stop rules

- Stop if analysis starts performing deterministic prep collection.
- Stop if recovery expands into open-ended retry loops.
- Stop if result output becomes narrative-only instead of implementation-driving.

## Resume notes

- Phase 03 prep bundle schemas must be stable before beginning.
- Preserve manifest-first selective consumption in all result design choices.

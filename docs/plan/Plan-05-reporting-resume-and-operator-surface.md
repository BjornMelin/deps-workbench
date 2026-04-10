# Plan 05 - reporting-resume-and-operator-surface

## Goal

Implement the compact operator-facing surface for reporting, end-to-end runs,
and resume workflows without breaking the clean command boundaries.

## Status

- [todo] Not started

## Locked decisions

- `report` renders both prep and result bundles
- compact output is the default
- `run` defaults to `implementation` mode
- `resume` is inspect-and-decide by default
- no silent mode switching; recommendations stay explicit

## Files and areas

- `src/commands/report.ts`
- `src/commands/run.ts`
- `src/commands/resume.ts`
- `src/core/reporting/**`
- `src/core/resume/**`
- `test/**`

## Steps

1. Implement compact prep/result renderers.
2. Implement `run` as the end-to-end orchestration wrapper.
3. Implement `resume` for prior-run inspection and explicit continuation.
4. Add tests for manifest-first operator flows and output-mode behavior.

## Verification

```bash
bun run typecheck
bun run test
```

## Stop rules

- Stop if `run` becomes a second analysis implementation instead of orchestration.
- Stop if `resume` silently reruns expensive work.

## Resume notes

- Phase 04 result bundle contracts must exist first.
- Keep operator output compact and action-oriented by default.

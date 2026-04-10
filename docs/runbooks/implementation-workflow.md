# Implementation Workflow

## Default flow

1. Open [docs/plan/README.md](../plan/README.md).
2. Select the first incomplete numbered phase unless a task explicitly targets a
   later phase.
3. Read the target phase document before editing.
4. Implement only that vertical slice.
5. Run the phase verification commands.
6. Update the phase-local status and master ledger in the same change.
7. If the phase changes repo behavior or authority, update the relevant docs.

## Stop rules

Stop and report `[blocked]` if any of these occur:

- a required external CLI is unavailable and no approved fallback exists
- a later phase depends on artifacts from an earlier incomplete phase
- implementation requires a new architecture branch not captured in the plan
  index
- verification fails for reasons outside the scoped phase and would require
  unrelated churn

## Resume rules

- Re-read the master planning index before resuming.
- Compare repo state against the phase-local status section.
- Do not assume a phase is done because files exist; trust the recorded
  verification state.
- If work drifted from the phase scope, record it explicitly before continuing.

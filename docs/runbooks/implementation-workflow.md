# Implementation Workflow

## Purpose

This runbook describes how future Codex sessions should execute work in this
repo without reopening architecture decisions or drifting across phases.

## Default flow

1. Open [docs/plan/README.md](../plan/README.md).
2. Select the first incomplete numbered phase unless the task explicitly targets
   a later phase.
3. Read the target phase document fully before editing.
4. Apply the phase persona and scope limits.
5. Work the phase task ledger from top to bottom.
6. Record execution notes and blockers in the phase file.
7. Run the phase verification commands.
8. Update the phase-local status section and master ledger in the same change.
9. If authority docs changed, update them before finalizing.

## Execution rules

- Treat each numbered phase as a near-standalone execution packet.
- Do not skip prerequisite discovery just because the final action seems clear.
- Prefer compact, checklist-driven reporting during execution.
- Keep command surfaces and architecture boundaries clean.
- If a phase reveals a missing architecture branch, stop and record it instead
  of silently inventing a new design.

## What to read for each phase

Always read:

- `AGENTS.md`
- `docs/plan/README.md`
- the target numbered plan file

Read additional authority docs only when directly relevant to the phase.

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
- Compare repo state against the target phase's recorded status.
- Do not trust file presence alone; trust verified status.
- If drift exists, record it in the phase file before continuing.

## Finalization rules

- Mark work done only after the declared phase verification passes.
- Update the master ledger and phase-local ledger together.
- Keep summaries short, factual, and verification-backed.

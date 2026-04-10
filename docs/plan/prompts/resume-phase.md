# Resume Phase Prompt

Use this prompt when returning to an in-progress or partially completed phase.

```text
Read AGENTS.md, docs/plan/README.md, and the target phase file first.
Compare the recorded phase status against the current repo state before editing.

Then:
1. State what the phase says is done vs what the repo actually contains.
2. Identify drift, unverified work, or incomplete verification.
3. Restate the phase persona and scope constraints.
4. Produce a compact resume checklist with [done], [todo], and [blocked].
5. Continue only the missing scoped work for the phase.
6. Write execution notes and blockers back into the phase file as you go.
7. Re-run the declared verification commands.
8. Update the phase-local status section and master ledger to reflect reality.

Rules:
- Do not trust file presence alone; trust verified status.
- Do not jump to a later phase unless the current phase is truly complete.
- If drift requires a new architecture choice, stop and mark it [blocked].
- Keep reporting compact and verification-backed.
```

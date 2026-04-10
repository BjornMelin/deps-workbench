# Resume Phase Prompt

Use this prompt when returning to an in-progress phase.

```text
Read AGENTS.md, docs/plan/README.md, and the target phase plan first.
Compare the recorded status against the current repo state before editing.

Then:
1. State what the phase says is done vs what the repo actually contains.
2. Identify any drift or unverified work.
3. Produce a compact resume checklist with [done], [todo], [blocked].
4. Continue only the missing scoped work for the phase.
5. Re-run the declared verification commands.
6. Update the phase-local status section and master ledger to reflect reality.

Rules:
- Do not trust file presence alone; trust verified status.
- Do not jump to a later phase unless the current phase is truly complete.
- If drift requires a new architecture choice, stop and mark it [blocked].
```

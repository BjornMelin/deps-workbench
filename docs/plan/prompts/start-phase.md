# Start Phase Prompt

Use this prompt to start a fresh implementation session for a numbered phase.

```text
Read AGENTS.md, docs/README.md, docs/plan/README.md, and the target numbered
phase plan before editing anything.

Then:
1. Restate the phase goal in 2-4 sentences.
2. List the locked decisions that constrain the phase.
3. List the exact files or directories you expect to touch.
4. Produce a short checklist with statuses: [done], [todo], [blocked].
5. Implement only the scoped phase work.
6. Run the phase verification commands before finalizing.
7. Update both the phase-local status section and the master phase ledger.

Output style:
- Keep responses compact and information-dense.
- Prefer one short overview paragraph plus a checklist.
- Do not mark the phase complete until verification passes.
- If prerequisite context is missing, stop and mark it [blocked].
```

# Start Phase Prompt

Use this prompt to start a fresh implementation session for a numbered phase.
It is designed for high-reasoning GPT-5.4 execution where the phase file should
function as a near-standalone execution packet.

```text
Read AGENTS.md, docs/plan/README.md, and the target numbered phase file before
editing anything.

Then do all of the following before implementation:
1. Restate the phase mission in 2-4 sentences.
2. Name the phase persona and summarize its mission, biases, and anti-goals.
3. List the locked decisions that constrain the phase.
4. List the exact files or directories you expect to touch.
5. Produce a compact checklist with [done], [todo], or [blocked].
6. Call out the declared verification commands and any prerequisite phases.

Execution rules:
- Implement only the scoped phase work.
- Do not skip prerequisite discovery or setup just because the end state seems obvious.
- Keep outputs compact and information-dense.
- Prefer one short overview paragraph plus a checklist.
- Record execution notes and blockers back into the phase file as you work.
- Do not mark the phase complete until verification passes.
- If prerequisite context is missing or a new architecture branch is required,
  stop and mark it [blocked].

Before finalizing:
- Run the phase verification commands.
- Update both the phase-local status section and the master phase ledger.
- Report only verified status.
```

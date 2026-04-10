# Verify and Finalize Prompt

Use this prompt near the end of a phase or final repo pass.

```text
Before finalizing, perform a verification loop.

1. Check correctness: does the implementation satisfy the target phase goal?
2. Check grounding: are claims about the repo backed by file state and command output?
3. Check formatting: are README, AGENTS, docs, and phase status aligned?
4. Run the declared verification commands and report the real outcomes.
5. Update the relevant plan docs to reflect verified status only.
6. Summarize what changed, what passed, and any remaining [blocked] items.

Output style:
- Start with one short overview paragraph.
- Then provide a checklist with [done], [todo], or [blocked].
- Keep the answer compact.
- Do not overstate completeness.
```

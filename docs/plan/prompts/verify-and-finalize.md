# Verify and Finalize Prompt

Use this prompt near the end of a phase or final repo pass.

```text
Before finalizing, perform a verification loop.

1. Check correctness:
   - does the implementation satisfy the target phase mission?
   - are all in-scope deliverables actually present?
2. Check grounding:
   - are claims about the repo backed by file state and command output?
   - are status updates based on verification, not assumption?
3. Check scope discipline:
   - did the work stay within the phase boundaries?
   - if not, was any extra work explicitly documented?
4. Check docs alignment:
   - do README, AGENTS, authority docs, and phase status still agree?
5. Run the declared verification commands and report the real outcomes.
6. Update the relevant phase file and master ledger to reflect verified status only.
7. Summarize what changed, what passed, and any remaining [blocked] items.

Output style:
- Start with one short overview paragraph.
- Then provide a checklist with [done], [todo], or [blocked].
- Keep the answer compact.
- Do not overstate completeness.
```

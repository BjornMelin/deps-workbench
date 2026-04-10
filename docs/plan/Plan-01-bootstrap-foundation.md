# Plan 01 - bootstrap-foundation

## Goal

Replace the generic Bun bootstrap output with the canonical repo scaffold,
authority docs, ignored runtime-state policy, and a minimal verifiable CLI/test
placeholder.

## Status

- [done] Bun bootstrap completed
- [done] Repo directories created
- [done] Authority docs drafted
- [done] Placeholder CLI and test scaffolded
- [done] Verification passed `bun run typecheck` and `bun run test`
- [done] Master ledger updated to reflect completion

## Locked decisions

- CLI-first single-package repo
- `bun init --yes` is the chosen bootstrap baseline
- `AGENTS.md` is the repo contract; `CLAUDE.md` must not remain
- `.local/` holds runtime state and stays untracked
- docs are public-ready and Apache-2.0 aligned

## Files and areas

- `README.md`
- `AGENTS.md`
- `.gitignore`
- `LICENSE`
- `package.json`
- `tsconfig.json`
- `src/cli.ts`
- `test/cli.test.ts`
- `docs/**`

## Steps

1. Remove Bun placeholder files that conflict with the chosen repo contract.
2. Establish the top-level repo identity and verification scripts.
3. Add the authority docs and planning index.
4. Add a small placeholder CLI/test so the repo has a real verifiable entry.
5. Verify with Bun-only local commands.

## Verification

```bash
bun run typecheck
bun run test
```

## Stop rules

- Stop if the repo can no longer be bootstrapped with Bun-only commands.
- Stop if README, AGENTS, and the planning index diverge on core architecture.

## Resume notes

- Reopen the master planning index first.
- If verification already passed, mark this phase and the master ledger `done`
  in the same change.

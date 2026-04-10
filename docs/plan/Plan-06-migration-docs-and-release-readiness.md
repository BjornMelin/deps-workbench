# Plan 06 - migration-docs-and-release-readiness

## Goal

Finalize migration from earlier helpers, align docs and prompts with the real
implementation, and reach release-readiness for the repo's first meaningful
operator release.

## Status

- [todo] Not started

## Locked decisions

- migration is a hard cut plus only a thin temporary shim if required
- docs must stay public-ready and authority-driven
- CI/release automation belongs here rather than in the bootstrap phase

## Files and areas

- migration shim files if required
- `docs/**`
- `README.md`
- `AGENTS.md`
- release and CI scaffolding as needed

## Steps

1. Add any thin migration shim required for old entrypoints.
2. Update docs and prompt templates to match the implemented command surface.
3. Add release-readiness checks and any minimal CI automation needed.
4. Run the repo-wide gate and mark the planning system complete.

## Verification

```bash
bun run check
```

## Stop rules

- Stop if a compatibility layer grows beyond a thin migration shim.
- Stop if docs claim capabilities that the repo cannot verify.

## Resume notes

- All earlier phases should be complete before starting.
- Treat doc accuracy as a release blocker.

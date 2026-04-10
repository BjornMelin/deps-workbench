# Plan 02 - schemas-storage-and-policy

## Goal

Create the typed foundation for the rest of the repo: Zod contracts, `.local/`
path and storage helpers, checked-in policy loading, and validation tests.

## Status

- [todo] Not started

## Locked decisions

- Zod is the source of truth for contracts
- runtime state lives under `.local/`
- checked-in policy lives in `config/deps-workbench.config.jsonc`
- config validation happens at load time, not later in the pipeline

## Files and areas

- `src/schemas/**`
- `src/core/storage/**`
- `src/core/policy/**`
- `config/deps-workbench.config.jsonc`
- `test/**`

## Steps

1. Define the base Zod schemas for prep manifests, result manifests, and policy.
2. Implement path helpers for `.local/runs`, `.local/cache`, and `.local/config`.
3. Add policy loading and validation with clear operator-facing errors.
4. Add fixture-backed tests for schema validation and storage path behavior.

## Verification

```bash
bun run typecheck
bun run test
```

## Stop rules

- Stop if policy loading requires environment-driven hidden defaults.
- Stop if contracts are duplicated outside `src/schemas/`.

## Resume notes

- Confirm Phase 01 is done before starting.
- Reuse the checked-in config file instead of introducing parallel defaults.

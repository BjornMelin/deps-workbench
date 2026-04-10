# Requirements Index

## Functional requirements

1. The repo must expose `prepare`, `analyze`, `report`, `run`, and `resume` as
   the canonical CLI surface.
2. `prepare` must collect deterministic local evidence and emit a typed prep
   artifact bundle plus manifest.
3. `analyze` must consume a prepared bundle and emit a typed result bundle plus
   `result_manifest.json`.
4. `report` must render compact summaries for prep and result bundles.
5. `run` must provide the normal end-to-end workflow.
6. `resume` must inspect prior run state and continue only when explicitly
   requested.
7. The repo must own the source of truth for package-coupled skills under
   `skills/`.
8. The repo must provide a documented install/sync path for bundled skills using
   the standard `skills` CLI through repo-level wrappers.

## Quality requirements

1. Zod must be the source of truth for checked-in contracts.
2. The repo must remain Bun-native and single-package in v1.
3. The primary analysis lane must remain OpenAI-first and OpenAI-only in v1.
4. Token-saving behavior must come from compact rendering and selective loading,
   not by discarding raw JSON evidence.
5. The system must keep per-claim confidence and explicit `UNVERIFIED` buckets.
6. Phase plans must be near-standalone execution packets, not lightweight notes.

## Operational requirements

1. Runtime state must stay under `.local/` and remain untracked.
2. Checked-in policy must live under `config/`.
3. Prep and analysis must support resumable run IDs plus reusable cache keys.
4. Recovery must stay bounded to one automatic hop with an allowlist.
5. Bundled skills must install outward as disposable mirrors.
6. Runtime package releases and bundled-skill releases must not require manual
   version bumping or manual GitHub release creation.

## Documentation requirements

1. `docs/plan/README.md` is the planning and routing authority.
2. Each numbered phase plan must define mission, context, persona, scope,
   explicit task ledger, verification, and stop/resume rules.
3. Prompt templates must support future `gpt-5.4-high` implementation sessions.
4. README, AGENTS, authority docs, and phase plans must remain aligned.
5. Bundled skills ownership, install flow, and release automation must be
   documented before the repo claims release readiness.

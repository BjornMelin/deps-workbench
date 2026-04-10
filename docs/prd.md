# Product Requirements Document

## Purpose

`deps-workbench` turns dependency-upgrade work into a deterministic prep step
plus a bounded analysis step so operators can move from version pressure to an
implementation-ready migration plan without paying repeated discovery cost in
interactive Codex sessions.

## Product goals

- Produce deterministic prep artifacts before model synthesis.
- Reduce token waste in primary Codex sessions through manifest-first loading.
- Generate implementation-driving result bundles instead of generic reports.
- Keep the system observable, resumable, and cheap to rerun.
- Support repo modernization work where `opensrc`, `bun`, `ctx7`, `gh`, and
  OpenAI analysis each have a clear role.

## Non-goals

- Replace repo-local editing and verification by the main Codex session.
- Become a general-purpose package manager.
- Support every provider or local model lane in v1.
- Ship as a monorepo or multi-service system in the first implementation wave.

## Primary users

- Operators running multi-repo dependency modernization work.
- Codex sessions that need structured prep artifacts and bounded analysis.
- Maintainers who want repeatable upgrade analysis with explicit evidence.

## Product pillars

- Deterministic prep first
- JSON-first contracts
- Implementation-driving outputs
- Manifest-first consumption
- Explicit uncertainty and bounded recovery

## V1 capability set

- Prepare canonical artifact bundles for a target dependency upgrade.
- Analyze prep bundles through an OpenAI-first runtime.
- Persist result bundles with action-oriented manifests.
- Render compact operator reports.
- Resume and intentionally rerun prior analyses.

## Success criteria

- The repo can generate and validate canonical prep/result schemas.
- The CLI command boundaries stay clean.
- A future implementation session can execute the numbered plans without
  reopening architecture questions.

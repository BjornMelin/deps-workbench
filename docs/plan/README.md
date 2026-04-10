# deps-workbench Planning Index

This file is the planning and routing authority for the repo buildout. Future
Codex implementation sessions should start here, not from ad hoc architecture
rediscovery.

## Current repo state

- [done] Git repository initialized
- [done] `bun init --yes` bootstrap completed
- [done] Formal authority docs, plan docs, and prompt templates checked in
- [done] Phase 01 bootstrap foundation
- [todo] Real command implementations and runtime modules

## Locked decisions

- Repository shape: single-package Bun-native repo
- Repo bias: CLI-first core
- Bootstrap baseline: hard cut to `bun init --yes`
- Planning system: master index plus numbered phase ExecPlans
- Phase granularity: one verifiable vertical slice per phase
- Dependency model: mostly sequential with explicit parallel-safe lanes
- Runtime state: hidden `.local/` subtree
- Checked-in policy: `config/deps-workbench.config.jsonc`
- Entrypoint: `src/cli.ts`
- Analysis lane: OpenAI Agents JS SDK, OpenAI-first seam, OpenAI-only in v1
- Docs model: embedded phase docs plus a lean central authority set
- Prompt support: small reusable prompt set under `docs/plan/prompts/`
- Public posture: publish-ready docs, Apache-2.0 license
- CI posture: planned in a later phase, not immediate scaffolding

## Recommended execution profile

For future implementation sessions:

- Use `gpt-5.4` with high reasoning effort when a phase is architecture-heavy.
- Keep outputs compact and checklist-driven.
- Follow dependency-aware sequencing: resolve prerequisites before later steps.
- Use selective parallelism only for independent evidence gathering.
- Do not mark a phase complete until its verification block passes.

These prompts are intentionally aligned with the OpenAI exec-plan pattern and
GPT-5.4 upgrade guidance: clear objective, dependency checks, compact reporting,
persistent tool use when needed, and explicit verification before finalizing.

## Phase ledger

| Phase | File | Status | Notes |
| --- | --- | --- | --- |
| 01 | [Plan-01-bootstrap-foundation.md](Plan-01-bootstrap-foundation.md) | done | repo scaffold and initial docs verified |
| 02 | [Plan-02-schemas-storage-and-policy.md](Plan-02-schemas-storage-and-policy.md) | todo | contracts, storage, policy |
| 03 | [Plan-03-prep-collectors-and-artifacts.md](Plan-03-prep-collectors-and-artifacts.md) | todo | deterministic prep collectors |
| 04 | [Plan-04-analysis-runtime-and-model-routing.md](Plan-04-analysis-runtime-and-model-routing.md) | todo | analysis runtime and routing |
| 05 | [Plan-05-reporting-resume-and-operator-surface.md](Plan-05-reporting-resume-and-operator-surface.md) | todo | operator commands and reporting |
| 06 | [Plan-06-migration-docs-and-release-readiness.md](Plan-06-migration-docs-and-release-readiness.md) | todo | migration, docs, release readiness |

## Execution order

Execute phases in order unless a phase explicitly declares a parallel-safe lane.
A later phase may reference earlier artifacts, but it must not silently assume
those artifacts exist.

## Phase summaries

### Phase 01

Bootstrap the canonical repo skeleton, replace Bun placeholders, establish the
authority docs, and make the repo verifiable with Bun-only local commands.

### Phase 02

Define the initial Zod contracts, `.local/` storage helpers, and checked-in
policy loading so later prep and analysis phases build on typed foundations.

### Phase 03

Implement deterministic prep collectors, preflight checks, and canonical prep
artifact bundle emission.

### Phase 04

Implement the OpenAI analysis runtime, routing policy, bounded recovery, and
implementation-driving result bundle generation.

### Phase 05

Implement `report`, `run`, and `resume`, plus compact-by-default operator output
and manifest-first consumption behavior.

### Phase 06

Finalize migration from legacy helpers, tighten docs and operator prompts, and
reach release-readiness with end-to-end verification.

## Final repo-wide gate

```bash
bun run check
```

## Prompt aids

- [start-phase.md](prompts/start-phase.md)
- [resume-phase.md](prompts/resume-phase.md)
- [verify-and-finalize.md](prompts/verify-and-finalize.md)

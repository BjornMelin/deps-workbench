# deps-workbench Planning Index

This file is the planning and routing authority for the repo buildout. Future
Codex implementation sessions should start here, not from ad hoc architecture
rediscovery.

## Why this file exists

The numbered phase plans are intended to be executable by future Codex sessions
running high-reasoning GPT-5.4 configurations without requiring the full prior
conversation history. That only works if this file clearly states:

- the locked architecture decisions
- the execution order
- the dependency graph between phases
- the status ledger
- the rules for reading and updating the plan system

Treat this file as the control plane for the repo buildout.

## Current repo state

- [done] Git repository initialized
- [done] `bun init --yes` bootstrap completed
- [done] Formal authority docs, references, and prompt templates checked in
- [done] Phase 01 bootstrap foundation verified complete
- [done] Bundled-skills metadata lane scaffolded under `skills/`
- [done] Phase 02 schemas, storage, and policy loading verified
- [done] Deterministic prep collectors and canonical prep artifacts
- [todo] Runtime modules and command implementations beyond prepare
- [todo] OpenAI analysis runtime and canonical result bundles
- [todo] Operator reporting, run, resume, and release automation flows
- [todo] Import package-coupled skills and wire install/sync automation

## Global locked decisions

### Repository and runtime

- Repository shape: single-package Bun-native repo
- Repo bias: CLI-first core
- Bootstrap baseline: hard cut to `bun init --yes`
- No Turborepo, monorepo split, or Vercel template in v1
- Entrypoint: `src/cli.ts`
- Runtime state: hidden `.local/` subtree
- Checked-in policy: `config/deps-workbench.config.jsonc`

### Product architecture

- Planning system: master index plus numbered phase ExecPlans
- Phase granularity: one verifiable vertical slice per phase
- Dependency model: mostly sequential with explicit parallel-safe lanes
- JSON-first artifacts and result bundles
- Zod as the checked-in contract source of truth
- Manifest-first selective consumption by the main Codex session
- Per-claim confidence plus explicit `UNVERIFIED`
- Conservative model routing and one bounded automatic recovery hop

### AI/runtime lane

- Analysis runtime: OpenAI Agents JS SDK
- Provider strategy: OpenAI-first seam
- Provider scope in v1: OpenAI only
- Mode set: `triage`, `research`, `implementation`
- Default operator path: `run` in `implementation` mode

### Bundled skills

- This repo owns the source of truth for package-coupled skills
- Skill source location: top-level `skills/`
- Planned bundled skill set:
  - `deps-workbench`
  - `opensrc-inspect`
  - `repo-modernize-upgrade-audit`
- Installed skill copies are mirrors only
- Install/sync should wrap the standard `skills` CLI
- Bundled skills have separate version metadata from runtime package releases
- Bundled skills are GitHub/repo-source distributed, not npm-coupled

### Release posture

- Public-ready docs and repo shape
- Apache-2.0 licensed repo
- CI and release automation belong to the later phases, not bootstrap
- Release automation target: semantic-release-centered, no manual bumping or
  manual GitHub release creation in the normal flow

## Phase dependency graph

- Phase 01 -> completed foundation and authority docs
- Phase 02 depends on Phase 01
- Phase 03 depends on Phase 02
- Phase 04 depends on Phase 03
- Phase 05 depends on Phase 04
- Phase 06 depends on all earlier phases

No later phase may silently assume earlier artifacts exist if the earlier phase
is not verified complete.

## Phase execution packet contract

Every numbered phase file must be treated as a near-standalone execution packet.
That means each phase file should contain:

- mission and success criteria
- explicit custom execution persona
- prerequisites and required context
- locked decisions relevant to the phase
- in-scope and out-of-scope boundaries
- a detailed checkbox task ledger
- execution notes and blockers sections for writeback
- verification commands and completion criteria
- stop rules and resume rules

If a phase file is missing any of these in a meaningful way, it is incomplete.

## How future Codex sessions should work

1. Read `AGENTS.md`.
2. Read this planning index.
3. Open the target numbered phase file.
4. Restate the mission, persona, scope, and verification plan.
5. Execute only that phase's task ledger unless explicitly directed otherwise.
6. Write notes and status updates back into the same phase file.
7. Update this master ledger in the same change when status changes.

## Recommended execution style for GPT-5.4-high sessions

Use a compact but persistent operator style:

- checklist-driven work tracking
- dependency-aware sequencing
- explicit verification before status updates
- no hidden scope expansion
- no silent architecture changes

These plans are intentionally aligned with the OpenAI exec-plan style and the
GPT-5.4 prompting guidance: clear objective, dependency checks, compact
reporting, persistent tool use when needed, and explicit verification loops.

## Phase ledger

| Phase | File | Status | Prerequisites | Primary outputs |
| --- | --- | --- | --- | --- |
| 01 | [Plan-01-bootstrap-foundation.md](Plan-01-bootstrap-foundation.md) | done | none | scaffold, docs, placeholder CLI/test |
| 02 | [Plan-02-schemas-storage-and-policy.md](Plan-02-schemas-storage-and-policy.md) | done | 01 | schemas, storage helpers, policy loader verified |
| 03 | [Plan-03-prep-collectors-and-artifacts.md](Plan-03-prep-collectors-and-artifacts.md) | done | 02 | preflight, collectors, prep bundles, manifests verified |
| 04 | [Plan-04-analysis-runtime-and-model-routing.md](Plan-04-analysis-runtime-and-model-routing.md) | todo | 03 | analysis runtime, routing, result bundles |
| 05 | [Plan-05-reporting-resume-and-operator-surface.md](Plan-05-reporting-resume-and-operator-surface.md) | todo | 04 | report/run/resume, compact operator flow |
| 06 | [Plan-06-migration-docs-and-release-readiness.md](Plan-06-migration-docs-and-release-readiness.md) | todo | 01-05 | bundled skills, release automation, migration, final readiness |

## Notes on Plan 06 scope

Phase 06 is not a generic docs cleanup phase. It specifically owns:

- bundled skill imports and metadata hardening
- wrapper scripts around the `skills` CLI
- release automation wiring
- any thin migration shim from older helper paths
- final doc alignment once the runtime is real

## Repo-wide final gate

```bash
bun run check
```

## Prompt aids

- [start-phase.md](prompts/start-phase.md)
- [resume-phase.md](prompts/resume-phase.md)
- [verify-and-finalize.md](prompts/verify-and-finalize.md)

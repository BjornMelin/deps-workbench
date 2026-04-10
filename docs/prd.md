# Product Requirements Document

## Purpose

`deps-workbench` turns dependency-upgrade work into a deterministic prep step
plus a bounded analysis step so operators can move from version pressure to an
implementation-ready migration plan without paying repeated discovery cost in
interactive Codex sessions.

## Problem

Modern dependency work is expensive in the wrong places. Operators repeatedly
spend attention on:

- inventorying package versions and upgrade targets
- re-running ad hoc `bun`, `opensrc`, `gh`, and doc lookups
- rediscovering upgrade blast radius
- deciding whether to implement immediately, review key claims, or stop blocked
- reconstructing evidence for why a recommendation is trustworthy

A strong interactive model can do this work, but it is wasteful when the same
repo/package lane is analyzed multiple times and the deterministic parts are not
captured first.

## Product goals

- Produce deterministic prep artifacts before model synthesis.
- Reduce token waste in primary Codex sessions through manifest-first loading.
- Generate implementation-driving result bundles instead of generic research
  prose.
- Keep the system observable, resumable, and cheap to rerun.
- Preserve a clean split between deterministic prep, model synthesis, and
  repo-local implementation work.
- Track and distribute package-coupled skills from the same source-of-truth repo
  without forcing runtime package and skill releases into one version line.

## Non-goals

- Replace repo-local editing and final verification by the main Codex session.
- Become a general-purpose package manager.
- Support every provider or local model lane in v1.
- Ship as a monorepo or multi-service platform in the first implementation wave.
- Force bundled skills into the npm distribution of the runtime package.

## Primary users

- Operators running multi-repo dependency modernization work.
- Codex sessions that need structured prep artifacts and bounded analysis.
- Maintainers who want repeatable upgrade analysis with explicit evidence.
- Skill authors/operators who need package-coupled skill prompts to track the
  same command and artifact contracts as the runtime.

## Product pillars

### Deterministic prep first

Collect evidence once, with typed outputs, before model reasoning begins.

### JSON-first contracts

Keep machine contracts authoritative and use markdown only as a compact operator
view.

### Implementation-driving outputs

The system should tell a repo-local implementation session what to change, why,
and how to verify it.

### Manifest-first consumption

The main Codex session should load a compact action-oriented manifest first,
then read only the next necessary artifact.

### Explicit uncertainty

Per-claim confidence and `UNVERIFIED` buckets are required; hidden uncertainty
in prose is not acceptable.

### Bundled skills with clean ownership

Package-coupled skills belong to this repo, install outward as mirrors, and are
released on their own metadata lane.

## V1 capability set

- Prepare canonical artifact bundles for a target dependency upgrade.
- Analyze prep bundles through an OpenAI-first runtime.
- Persist result bundles with action-oriented manifests.
- Render compact operator reports.
- Resume and intentionally rerun prior analyses.
- Track the package-coupled skills that depend on `deps-workbench` contracts.

## Distribution posture

- Runtime CLI: npm-ready in the future, GitHub-first while developing.
- Bundled skills: GitHub/repo-source distribution, not npm-coupled.

## Success criteria

- The repo can generate and validate canonical prep and result schemas.
- The CLI command boundaries stay clean.
- A future implementation session can execute the numbered plans without
  reopening architecture questions.
- Bundled skills can be tracked, versioned, and installed from this repo without
  drifting from the runtime contract.
- Release automation can be fully automated with SemVer, changelogs, and GitHub
  releases without manual bumping.

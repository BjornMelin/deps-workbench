# Repository Architecture Reference

## Repository shape

`deps-workbench` is intentionally a single-package Bun-native repository.

That decision is locked because:

- the product is CLI-first
- the deterministic prep and analysis runtime belong in one coherent codebase
- monorepo and Turborepo overhead do not buy enough at v1 scale
- future package splits can happen later if real boundaries emerge

## Architectural layers

### CLI layer

`src/cli.ts` and `src/commands/**` define the operator-facing contract.

### Core runtime layer

`src/core/**` contains deterministic prep, policy loading, storage, analysis
runtime orchestration, reporting, and resume logic.

### Schema layer

`src/schemas/**` is the checked-in contract source of truth.

### State layer

`.local/**` holds untracked runtime state:

- runs
- cache
- local operator config

### Bundled skills lane

`skills/**` is not part of the runtime command surface. It is the source of
truth for package-coupled skills that depend on this repo's command contracts.

## Artifact model

### Prep bundle

The prep lane writes a typed bundle and manifest for deterministic evidence.
Expected families include:

- `meta.json`
- `docs.json`
- `releases.json`
- `source_paths.json`
- `diff.json`
- `usage.json`
- `signals.json`
- `manifest.json`

### Result bundle

The analysis lane writes an implementation-driving bundle and manifest,
including:

- `result_manifest.json`
- `executive_brief.md`
- `decision_report.json`
- `evidence_map.json`
- `implementation_checklist.json`
- `validation_checklist.json`
- optional `open_questions.json`

## Outcome model

The analysis runtime should classify outcomes explicitly:

- `ready_to_implement`
- `review_required`
- `blocked`
- `degraded_reference_only`

And provide a small finite primary action enum such as:

- `implement_now`
- `review_key_claims`
- `refresh_missing_evidence`
- `re_run_with_escalation`
- `stop_blocked`

## Routing model

The runtime uses conservative model routing:

- `gpt-5.4-nano` for extraction and lightweight compaction
- `gpt-5.4-mini` for standard synthesis
- `gpt-5.4` only when risk signals justify escalation

## Recovery model

Allow one bounded automatic recovery hop only, from a strict allowlist.
Anything more becomes opaque agent churn and is out of scope.

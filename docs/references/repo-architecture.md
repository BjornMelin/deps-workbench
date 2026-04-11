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

`decision_report.json` carries the synthesis `semanticOutcome`, and blocked
runs must preserve `semanticOutcome: blocked` there instead of collapsing to a
degraded/reference-only fallback. `result_manifest.json` records the executed
model in `modelUsed` when synthesis actually runs, the routed model in
`routingDecision.selectedModel`, and the read order now appends
`open_questions.json` when that file exists. Blocked runs may omit
`modelUsed`; the CLI renders that state as `not executed`.

Prepared bundles are loaded through the run directory boundary, and manifest-
declared artifact files are validated so they stay inside the owning run before
the analysis runtime reads them. Result claims and evidence references are kept
locatable: evidence refs must include at least a `package` or `locator` field.

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

Major-version routing treats semver ranges/prefixes conservatively and counts
`0.x -> 1.x` as a high-risk upgrade boundary.

The OpenAI analysis lane should request schema-typed output from the Agents SDK
so synthesis results arrive as contract-validated structured data instead of
free-form JSON text that must be reparsed manually.
If the SDK cannot produce a final structured output, or if parsing rejects the
agent payload, treat that as a blocked analysis path, map the run to `blocked`
with `stop_blocked`, and stop before writing a misleading synthesis result.
The runtime should guard `finalOutput` explicitly before proceeding, matching
the same check used in `src/core/models/openai-analysis.ts`, where missing
`finalOutput` and `ModelBehaviorError` both fail the structured-output path
instead of pretending synthesis succeeded.

## Recovery model

Allow one bounded automatic recovery hop only, from a strict allowlist.
Anything more becomes opaque agent churn and is out of scope.

Automatic escalation recovery is limited to `implementation` mode. `triage` and
`research` runs keep the originally routed tier even when the synthesis remains
review-oriented.

For `implementation` runs, automatic escalation is still gated by
`recoveryEscalationMin`; a low-risk review-required result should stay on its
original tier instead of silently rerunning on `full`.

Recovery state must distinguish between "rerun happened" and "uncertainty was
resolved". Record escalation as succeeded only when the rerun upgrades the
final outcome to `ready_to_implement`; otherwise preserve the retry history
without claiming automatic recovery.

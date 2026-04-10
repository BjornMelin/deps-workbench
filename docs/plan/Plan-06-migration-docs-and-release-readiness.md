# Plan 06 - migration-docs-and-release-readiness

## Phase mission

Finalize migration from earlier helpers, align docs and prompts with the real
implementation, import and govern the bundled skills lane, and reach release
readiness for the repo's first meaningful operator release.

This phase is where the repo stops being "internally coherent in development"
and becomes a cleanly releasable product plus skills source.

## Phase status

- [todo] Not started

## Custom execution persona

### Persona name

Release Integrator

### Persona mission

Harden the repo for release, migrate any remaining legacy helper paths, import
and wire the bundled skill set, and ensure docs, prompts, install flows, and
release automation all match the implemented system exactly.

### Persona biases

- prefer hard cuts and final authority over compatibility sprawl
- automate versioning, changelogs, and release creation
- make bundled skills clearly installable and auditable

### Persona anti-goals

- do not ship vague docs that overclaim capability
- do not keep long-lived compatibility layers
- do not require manual bumping or manual GitHub release drafting

## Why this phase matters

This phase closes the gap between a technically functional repo and a usable,
releasable operator tool. It also resolves the package-coupled skill ownership
model, which is part of the repo contract now.

## Preconditions

- Phases 01 through 05 must be complete and verified
- runtime command surface and artifact contracts must be stable enough to teach
- bundled-skills metadata lane must already exist

## Locked decisions for this phase

- migration is a hard cut plus only a thin temporary shim if required
- docs must stay public-ready and authority-driven
- bundled skills are sourced from this repo under `skills/`
- install flows wrap the standard `skills` CLI
- bundled skills use separate version metadata from runtime releases
- release automation is semantic-release-centered
- runtime package and bundled skills do not share one forced release identity
- bundled skills are GitHub/repo-source distributed, not npm-coupled

## In scope

- thin migration shims if needed
- final docs and prompt alignment
- importing the two existing local dependent skills into this repo
- adding the new direct `deps-workbench` skill
- adding skills metadata hardening and wrapper scripts
- release automation planning and implementation
- final readiness verification

## Out of scope

- inventing a broader skills ecosystem beyond the package-coupled set
- adding provider lanes beyond the locked v1 scope
- long-lived compatibility architecture

## Required context before editing

Read before implementation:

- `AGENTS.md`
- `docs/plan/README.md`
- `docs/references/bundled-skills.md`
- `docs/references/release-automation.md`
- `skills/README.md`
- `skills/skills-manifest.jsonc`
- all completed phase outputs

## Target file areas

- migration shim files if required
- `docs/**`
- `README.md`
- `AGENTS.md`
- `skills/**`
- release and CI scaffolding as needed
- repo Bun scripts for skills install/sync wrappers

## Deliverables

- thin migration shim only if still required
- final doc alignment to the real runtime
- imported skill folders for:
  - `deps-workbench`
  - `opensrc-inspect`
  - `repo-modernize-upgrade-audit`
- bundled-skills install/check/sync wrapper scripts
- separate bundled-skills version metadata and changelog flow
- semantic-release-centered release automation wiring
- final repo-wide readiness verification

## Task ledger

### Migration hard-cut

- [ ] identify any remaining legacy helper entrypoints or references
- [ ] add only a thin migration shim if unavoidable
- [ ] remove or document the retirement of superseded paths

### Bundled skills import

- [ ] import the current `opensrc-inspect` skill folder into `skills/`
- [ ] import the current `repo-modernize-upgrade-audit` skill folder into `skills/`
- [ ] create the new `deps-workbench` skill folder in `skills/`
- [ ] update imported skills to use the real runtime command surface and paths
- [ ] verify runtime names remain stable

### Bundled skills metadata and docs

- [ ] update `skills/skills-manifest.jsonc` from planned to active state
- [ ] update `skills/CHANGELOG.md`
- [ ] expand `skills/README.md` with install and sync instructions
- [ ] document Bun-first `skills` CLI usage with `npx` compatibility notes

### Skills install/sync tooling

- [ ] add repo Bun scripts that wrap the standard `skills` CLI
- [ ] support check/list behavior
- [ ] support dry-run sync as the default
- [ ] support explicit apply sync
- [ ] avoid treating installed mirrors as editable sources

### Release automation

- [ ] wire semantic-release-centered runtime release automation
- [ ] wire automated GitHub release creation
- [ ] prepare optional npm publish path for runtime package only
- [ ] wire separate bundled-skills version/changelog update logic
- [ ] ensure skill-only changes do not force runtime package releases

### Final docs and prompt alignment

- [ ] update README to match the real command surface
- [ ] update AGENTS to match the final operator flow
- [ ] update authority docs to remove any remaining future-tense drift
- [ ] update prompt templates to match the implemented repo reality

### Final readiness verification

- [ ] run the repo-wide gate
- [ ] verify bundled-skill metadata and install docs align with reality
- [ ] mark the master planning index complete only after all required checks pass

## Execution notes

- [ ] add notes here as implementation proceeds

## Blockers

- [ ] none recorded yet

## Verification

```bash
bun run check
```

## Verification record

- [ ] `bun run check`

## Completion criteria

This phase is complete only if:

- there is no confusing long-lived compatibility layer
- docs and prompts match the implemented repo exactly
- bundled skills are sourced from this repo with documented install/sync flow
- release automation is designed and implemented for no-manual-bump normal flow
- the repo-wide gate passes
- the phase and master ledger are updated together

## Stop rules

- Stop if a compatibility layer grows beyond a thin migration shim.
- Stop if docs claim capabilities that the repo cannot verify.
- Stop if bundled skills drift from runtime command and artifact contracts.
- Stop if release automation requires manual version editing in the normal path.

## Resume rules

- Confirm all earlier phases are complete first.
- Treat doc accuracy and bundled-skill install accuracy as release blockers.
- Record every migration or release-model compromise in this file explicitly.

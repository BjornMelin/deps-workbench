# Release Automation Reference

## Goal

Release automation in this repo should avoid manual version bumps, manual
GitHub releases, and manual changelog maintenance.

## Chosen posture

Use a `semantic-release`-centered strategy, driven by Conventional Commits.

Why this is the best fit here:

- fully automated SemVer calculation
- automated changelog and release-note generation
- automated GitHub release publishing
- compatible with npm publishing for the runtime package later
- avoids manual changeset authoring

## Release split

The repo has two release concerns that should not be conflated:

### Runtime package lane

- eventually npm-publishable
- GitHub releases should be automated
- versioning should follow runtime-impacting Conventional Commits

### Bundled skills lane

- GitHub/repo-source distributed
- not part of npm package publishing by default
- should maintain its own version manifest and changelog lane
- should generate GitHub-visible release notes when skill changes occur

## Implementation guidance for later phases

Plan 06 should implement a release flow that can:

- automate runtime releases from Conventional Commits
- automate GitHub releases
- optionally automate npm publishing for the runtime package later
- detect `skills/**` changes and update the bundled-skills version metadata
- generate a bundled-skills changelog/release-note lane without forcing a
  runtime package bump

## Notes from current research

- The official semantic-release docs emphasize fully automated release flow from
  commit conventions and CI-driven publishing.
- The current `skills` CLI ecosystem expects skills to be installable from a
  repo/package source, which reinforces keeping the bundled-skills lane GitHub
  oriented rather than npm-coupled.

## Constraints

- Do not require manual GitHub release drafting.
- Do not require manual version editing as the normal release path.
- Do not force runtime and bundled-skills versions into one shared SemVer line.

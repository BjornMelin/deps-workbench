# Bundled Skills

This directory is the future source of truth for the package-coupled skills that
depend on `deps-workbench` command contracts and artifact shapes.

## Planned skills

- `deps-workbench`
- `opensrc-inspect`
- `repo-modernize-upgrade-audit`

## Ownership rules

- Edit skills here, not in installed global copies.
- Installed copies under agent skill directories are mirrors only.
- Use Bun-first wrappers around the standard `skills` CLI for install and sync.
- Keep bundled-skills version metadata separate from runtime package releases.

## Current status

- metadata lane scaffolded
- actual skill imports and sync wrappers deferred to Plan 06

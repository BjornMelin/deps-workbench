# Bundled Skills Reference

## Purpose

This repo owns the source of truth for the package-coupled skills that depend
on `deps-workbench` command contracts and artifact shapes.

## Planned bundled skill set

- `deps-workbench`
- `opensrc-inspect`
- `repo-modernize-upgrade-audit`

## Ownership model

- Source of truth: this repo
- Tracked location: top-level `skills/`
- Runtime install target: global-first install into agent skill directories
- Installed copies: mirrors only
- Edit policy: edit in-repo, sync outward, overwrite installed mirrors

## Install model

The repo should wrap the standard `skills` CLI instead of inventing a parallel
installer.

Canonical public examples should be Bun-first:

```bash
bunx skills add <repo-or-package>
```

Compatibility note:

```bash
npx skills add <repo-or-package>
```

## Sync model

The repo should expose Bun scripts that wrap the official CLI for:

- install/check
- dry-run sync
- explicit apply sync

Dry-run should be the default. Overwrite should require explicit operator
intent.

## Versioning model

Bundled skills should not share the exact release identity of the runtime
package. Instead:

- keep one git repo
- maintain a separate skills version manifest
- maintain a bundled-skills changelog
- generate GitHub-facing release notes for the skills lane without implying a
  runtime package release

## Distribution model

- Runtime CLI: npm-ready later
- Bundled skills: GitHub/repo-source distribution only
- Do not force bundled skills into the npm tarball by default

## Current implementation status

- Source-of-truth decision is locked
- Metadata lane is scaffolded in `skills/`
- Real skill imports and install wrappers belong to Plan 06

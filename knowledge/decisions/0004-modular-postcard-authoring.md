# 0004 — Modular postcard authoring

`[decision]` `[decision-record]` `[rendering]` `[animation-controls]`

**Status:** accepted · supersedes 0003 for migrated postcards

## Context

Keeping public and controls pages independently self-contained duplicated every
renderer and its configuration. Saving controls values therefore required
manual reconciliation across source copies.

## Decision

Migrated postcards use one local scene module and one values file. Both their
public and controls pages load those files through a local preview server.
Controls may change values live and download a replacement values file. Shared
controls primitives belong in `gallery/shared/` once used by more than one
postcard. Each controls page declares its scene-specific middle sections
directly from the shared builder; it does not keep a second static form and
transform it at runtime.

## Consequences

- Authors start `python3 -m http.server` instead of double-clicking migrated
  pages.
- A renderer change and saved values now have one authoritative home.
- Every migrated controls page has the same Basics section, control behaviour,
  and fixed export footer while retaining scene-specific creative sections.
- Single-file distribution exports remain a possible later feature, not an
  authoring constraint.

# Gallery

## Purpose

The user-facing collection and routing layer for runnable coded animation postcards.

## Boundaries

- **In scope:** the gallery landing page, postcard discovery, and postcard entry points.
- **Out of scope:** product theory, shared rendering code, and agent instructions.

## Context

`[gallery]` `[readme]` `[index]` `[routing]` — the path from the collection to
an individual animation.

## Handbook

- [`index.html`](index.html) — `[entry-point] [runnable]` — shows only
  postcards whose saved gallery metadata is published; their hover writing is
  rendered over the preview
- every postcard’s public and controls surfaces read its shared `values.json`
- [`export-server.py`](export-server.py) — `[authoring] [video-export]` — serves
  the gallery and converts recorded WebM exports to MP4 with local FFmpeg
- [`postcards/README.md`](postcards/README.md) — `[index] [routing]`

## Local rules

Keep the gallery landing page lightweight. Postcard structure, controls, and
reference-material rules live in [`AGENTS.md`](../AGENTS.md).

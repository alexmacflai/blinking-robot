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
  rendered over the preview, and visitors can temporarily preview only exposed
  global palette and pixel presets
- [`controls.html`](controls.html) — `[authoring] [entry-point]` — global
  rendering-preset authoring surface; its shared Save Global Settings action
  writes the tracked settings source through the local authoring server
- [`render-settings.json`](render-settings.json) — versioned source of truth
  for named global palettes, pixel presets, defaults, and visitor exposure
- every postcard’s public and controls surfaces read its shared `values.json`
- [`export-server.py`](export-server.py) — `[authoring] [video-export]` — serves
  the gallery, saves postcard/global authoring settings and named local
  snapshots only for loopback clients, and converts recorded WebM exports to
  MP4 with local FFmpeg
- [`postcards/README.md`](postcards/README.md) — `[index] [routing]`

## Local rules

Keep the gallery landing page lightweight. Postcard structure, controls, and
reference-material rules live in [`AGENTS.md`](../AGENTS.md).

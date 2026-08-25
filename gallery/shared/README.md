# Shared postcard code

Reusable browser code used by two or more postcard authoring surfaces.

## Context

`[gallery]` `[controls]` `[shared]`

## What is here

- [controls.js](controls.js) — component-first authoring-panel builder for
  both postcard and global authoring, canonical sidebar shell, shared controls,
  update contract, action bar,
  copying, local default, gallery, and snapshot settings saves, values
  downloads, gallery-writing controls, and hard-pixel PNG/MP4
  export helpers. Its controls tokens define the monochrome palette,
  `#C5E714` accent, spacing, borders, scrollbar, and Fira type stack.
- [playback.js](playback.js) — tested pause/restart state used by animated
  postcards so author pauses and gallery visibility pauses cannot race.
- [render-settings.js](render-settings.js) — loads and locally saves the
  tracked global preset registry, applies a selected palette/pixel preset,
  seeds distinct two-bit channels, and relays live gallery preview choices
  without resetting a palette-only animation.
- [fonts/](fonts/README.md) — local Fira Sans and Fira Mono files used by the
  controls, without a remote font dependency.
- [controls-theme.css](controls-theme.css) — the static controls tokens, fonts,
  and loading state. Every controls page links this in its `<head>` so the
  loading view is styled before its authoring module starts.

## Local rules

Keep scene-specific rendering and control declarations in each postcard folder.
The shared builder owns the sidebar shell, generic Basics section, footer, and
control behaviour; postcard modules add their scene-specific middle sections.
Every postcard has one `values.json` read by both public and controls pages.
When served by `export-server.py` on loopback, controls can overwrite that
default locally or save named alternatives in the postcard's `snapshots/`
folder. Gallery details in a postcard's `gallery.json` are also saved locally.
Static previews remain read-only and retain downloadable JSON files.

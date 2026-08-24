# Windmill postcard

A coded animation postcard of a windmill.

## Context

`[windmill]` `[cloud]` `[sky]` `[bird]` `[wind]` `[particles]` `[sim]`

## Open

- [`index.html`](index.html) — public postcard
- [`controls.html`](controls.html) — maker-facing controls
- [`authoring.js`](authoring.js) — Windmill’s component-first controls declaration
- [`scene.js`](scene.js) — shared Windmill renderer
- [`values.json`](values.json) — the single saved configuration for both pages
- [`brief.md`](brief.md) — scene intent
- [`references/README.md`](references/README.md) — supplied source material

## Local rules

Run this postcard through the repository's local preview server. Save values
downloads a replacement `values.json`; that one file supplies both surfaces.
Save Frame exports the currently rendered Windmill frame as a 2160×3840 PNG.
It fills the portrait frame directly with smoothing disabled, preserving the
postcard's hard pixel grid.

Postcard surface, controls, and reference-material requirements live in
[`AGENTS.md`](../../../AGENTS.md).

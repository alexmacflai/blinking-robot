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
  (including gallery publish state and hover writing)
- [`brief.md`](brief.md) — scene intent
- [`references/README.md`](references/README.md) — supplied source material

## Local rules

Run this postcard through the repository's local preview server. The local
authoring server can save the default directly to `values.json`, or save named
alternatives in `snapshots/`; loading a snapshot does not overwrite the
default. Download Values remains available for static preview. That one default
file supplies both surfaces.
The **Gallery** section decides whether the postcard appears in the gallery and
stores the hover writing, with paragraphs, bold, and italics.
Save Frame exports the currently rendered Windmill frame as a 2160×3840 PNG.
It fills the portrait frame directly with smoothing disabled, preserving the
postcard's hard pixel grid.
Save Video records the current Windmill animation into a 30-second,
1080×1920 WebM at 30fps, then the local authoring server transcodes it to H.264
MP4. Start that server with `python3 gallery/export-server.py`; it leaves the
live preview at its normal size.

Postcard surface, controls, and reference-material requirements live in
[`AGENTS.md`](../../../AGENTS.md).

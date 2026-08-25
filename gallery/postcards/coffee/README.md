# Coffee postcard

A coded animation postcard of an espresso machine and a full cup.

## Context

`[coffee]` `[liquid]` `[sim]` `[particles]`

## Open

- [`index.html`](index.html) — public postcard
- [`controls.html`](controls.html) — maker-facing controls
- [`authoring.js`](authoring.js) — Coffee’s shared-component controls declaration
- [`bootstrap.js`](bootstrap.js) — loads the saved values before scene and controls
- [`values.json`](values.json) — the one saved creative configuration for both pages
- [`gallery.json`](gallery.json) — gallery publish state and hover writing
- [`brief.md`](brief.md) — scene intent
- [`references/README.md`](references/README.md) — supplied source material

## Local rules

The local authoring server can save the default directly to `values.json`, or
save named alternatives in `snapshots/`; loading a snapshot does not overwrite
the default. Download Values remains available for static preview. Gallery publish state and
hover writing are saved separately in `gallery.json`. Save Frame exports a
hard-pixel 2160×3840 PNG; Save Video uses the local authoring server for MP4.

Postcard surface, controls, and reference-material requirements live in
[`AGENTS.md`](../../../AGENTS.md).

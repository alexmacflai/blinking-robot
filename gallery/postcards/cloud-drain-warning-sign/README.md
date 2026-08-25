# Cloud-drain warning sign postcard

A coded animation postcard of a warning sign above a sea of clouds that drains
away beneath it.

## Context

`[sign]` `[cloud]` `[spiral]` `[sky]` `[wind]`

## Open

- [`index.html`](index.html) — public postcard
- [`controls.html`](controls.html) — maker-facing controls
- [`authoring.js`](authoring.js) — this postcard’s scene-specific controls declaration
- [`bootstrap.js`](bootstrap.js) — loads the saved values before scene and controls
- [`scene.js`](scene.js) — the shared renderer for both surfaces
- [`values.json`](values.json) — the one saved creative configuration for both pages
- [`gallery.json`](gallery.json) — gallery publish state and hover writing
- [`brief.md`](brief.md) — scene intent and design position
- [`references/README.md`](references/README.md) — supplied source material

## Local rules

The whirlpool is a per-pixel field, not a particle system: the spiral's phase
is a function of angle and `ln(radius)`, so advancing it with time both pulls
material inward and shrinks its spacing on the way. Nothing is spawned or
destroyed, and there is no cycle to return to.

The sign and pole are drawn after the field and never read from it. Pole sway
is wind only and defaults to still; if it is raised, it must stay small enough
that the sign never appears pulled toward the drain.

Postcard surface, controls, and reference-material requirements live in
[`AGENTS.md`](../../../AGENTS.md).

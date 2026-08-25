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

The cloud is a thresholded density field, not tonal shading. Shading alone has
flow but no material and reads as a gradient; the lobes and their silhouettes
are what make it cloud, so the density is cut hard into mass and gaps rather
than painted as a ramp.

The spiral is never drawn. Material is placed by an inverse flow map — each
point asks where its cloud came from — and the arms are produced by
differential rotation shearing the lobes over time. Set `pool.shear` to 0 and
the field turns rigidly with no spiral at all, which is the check that the
arms are a consequence rather than a pattern. The same winding squeezes a wide
annulus onto a narrow one, so lobes shrink as they travel inward.

The centre empties by raising the density cutoff, not by fading tone: material
runs out before the middle, so there is no last shape left to pop.

The sign and pole are drawn after the field and never read from it. Pole sway
is wind only and defaults to still; if it is raised, it must stay small enough
that the sign never appears pulled toward the drain.

Postcard surface, controls, and reference-material requirements live in
[`AGENTS.md`](../../../AGENTS.md).

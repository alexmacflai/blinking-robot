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

There is ONE cloud. Not a cloud field, not a collection of clouds, and not a
texture: a single continuous body whose shape is a spiral. It is built from
heavily overlapping lobes strung along a logarithmic helix, exactly as the
discs inside a thick line build one stroke. The lobe count is an
implementation detail and must never become visible as separate puffs.

The spiral is geometry, not a drawn pattern. The spine is fixed; material
flows along it inward, and lobe size follows the coil radius, so the cloud
shrinks as it winds in rather than being faded down.

Depth is real. A perspective camera looks down into the funnel, lobes are
sorted by camera depth and drawn back to front, and the near arc of the body
occludes its own far arc. The pole is depth-tested against the cloud for the
same reason. Getting the camera pitch sign wrong inverts the read: the far
rim must project higher on screen than the near rim.

Nothing accumulates. The flow phase wraps, so the cloud runs on a fixed cycle
and the scene at an hour is the scene at ten seconds. An earlier version wound
its coordinates by `exp(rate*t)` with no bound and decayed into static after a
couple of minutes; use the controls page's TIME section to confirm any change
still survives a long run.

The sign and pole are drawn after the cloud and never read from it. Pole sway
is wind only and defaults to still; if raised, it must stay small enough that
the sign never appears pulled toward the drain.

Postcard surface, controls, and reference-material requirements live in
[`AGENTS.md`](../../../AGENTS.md).

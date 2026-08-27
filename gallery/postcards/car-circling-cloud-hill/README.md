# Car circling a cloud-covered hill postcard

A coded animation postcard of traffic crossing a hill that stands between two
layers of cloud.

## Context

`[car]` `[hill]` `[road]` `[house]` `[cloud]` `[sky]` `[depth]`

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

Occlusion is geometry, not draw order. The hill, road, house and cars are
world-space forms put through one camera and resolved by a depth buffer. A car
on the far side is hidden because the hill is genuinely in front of it, and the
far stretch of road is hidden for the same reason — the road is a strip offset
outward along the hill’s own surface normal, never a curve drawn onto a
finished silhouette. Do not replace any of this with layer ordering: every
acceptance criterion in the ticket about what covers what depends on it.

The hill is a **flat mass**. Its tone is near-constant with the fall-off pushed
out to the silhouette, because the road is the only mark it carries and a dome
gradient bands under the dither along the same axis. Raising the silhouette
darkening is how the hill stays separate from a cloud of its own value behind
it; shading the dome is not.

Keep the centre dashes clearly lighter than a car. They are a road marking, and
when they are as dark as a car it becomes hard to tell moving from static.

The still world — hill, road, dashes, and the house body — is **baked once**
into a luminance/depth/coverage layer at build time. Anything that changes
their geometry, tone, or the camera must re-bake, which is why those controls
use `rebuild` rather than `render`. Cars, the chimney's smoke, and optional
cloud drift are evaluated per frame; none of them are part of the bake. The
smoke plume is a continuous rising stream, not a one-off animation — each
puff's position is a wrapped phase, the same mechanism the traffic uses, so
nothing pops in or out and nothing accumulates however long the scene runs.

The clouds are four two-dimensional lobed banks in the windmill’s manner, not
objects in the depth buffer: exactly two behind the hill and exactly two in
front. Each front bank has its own group-level mask that ramps from `0.7` at
the upper edge to `1` at its hard group boundary and below, so the hill and
traffic remain visible through the cloud group without blur, feathering, or
per-lobe holes. Their motion is depth-aware: the rear uses
the minimum wind, the front the maximum, and the middle banks interpolate
between them.

Nothing accumulates. Cars are slots on a phase wrapped into a fixed span longer
than the road itself; the extra length is empty, so nothing is seen to appear
on the road or turn round. Car identity is hashed from the wrap count, so the
procession keeps changing while no state is kept. Use the controls page’s TIME
section to confirm any change still survives a long run.

Postcard surface, controls, and reference-material requirements live in
[`AGENTS.md`](../../../AGENTS.md).

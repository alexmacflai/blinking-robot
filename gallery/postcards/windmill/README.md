# Windmill postcard

## Purpose

The first Blinking Robot postcard: a static windmill scene with internal motion. It is a procedural, self-contained 1-bit/dithered animation with no external assets.

## Boundaries

- **In scope:** this scene, its renderer, controls, configuration, and postcard-specific behavior.
- **Out of scope:** shared runtime extraction, gallery navigation, and product-wide visual rules.

## Context

`[postcard]` `[windmill]` `[procedural-rendering]` `[1-bit]` `[dither]` `[animation-controls]` — one still world with wind, depth, revealed cloud, and a turning mill.

## Handbook

Open [`index.html`](index.html) directly. Space pauses, H toggles the readout, and the panel exposes scene and output controls.

[`references/README.md`](references/README.md) records source material supplied
for this postcard. It informs the scene but is never loaded by the animation.

The L2 cloud deck is **inert** — an ordinary bank like the other three, with no
carve field, no tearing and no debris. All sail-cloud interaction lives in the
fifth cloud below.
[`0001`](../../../knowledge/decisions/0001-cloud-deck-as-field.md) records why
the deck is a flat field rather than a particle system;
[`0002`](../../../knowledge/decisions/0002-sail-cloud-interaction-as-emitter.md)
records why its carve/debris half was retired, and why leaving two interaction
mechanisms running at once was the actual bug.

A fifth cloud sits in the third depth slot, between L3 and the deck. It is a
particle medium that is never drawn until a sail touches it: an off-frame
emitter lays down columns of particles across L3's height, and a blade sweeping
through reveals its own swept ribbon out of apparently empty sky.

It is the only place the sails touch cloud.

**The throughput fact.** The rotor sweeps x −4..224 in a 234-wide frame, so
there is no upwind reservoir. The medium already in frame is an *area* and is
eaten within the first few sweeps; everything after that is a *line* budget:

    particles/sec = density × band height × drift speed

No emitter phrasing beats that limit. This is why the medium used to look
generous for a few seconds and then thin out to spitting — the opening burst
was the prefilled area being consumed, and the equilibrium behind it was set by
what crosses the left edge. Two consequences are load-bearing:

- `warmup()` runs `resolveEmit` so the mill has already eaten its wake before
  frame one. Without it the first sweeps harvest a whole frame of pristine
  medium and the animation opens on a burst it cannot sustain.
- If the plume looks sparse, raise **density**, not output. `emit.output` only
  over-feeds the incoming edge; `emit.density` is the only control that moves
  the equilibrium.

The 5th CLOUD panel section exposes density, emitter output, launch, fade and
clearance, and reports the live feed rate and in-frame count.

Two invariants hold it together, both verifiable from the console:

- **A particle is never inside a blade.** This is a positional constraint, not
  a force: at render time, in the projected rotor space the sails are actually
  rasterised in, anything inside a blade is moved onto its face. Forces cannot
  express this, because a particle is inside the blade for as long as a force
  is pushing it out. The exclusion zone is the blade dilated by `emit.pad` in
  *both* axes — padding only the sides leaves a gap at the tip that particles
  escape through.
- **Contact and reveal are the same event**, so a particle can never appear
  without having been touched, nor be touched without appearing.

`__mill.emit()` reports `insideBlade`; it must read 0 on every frame, at every
grid, yaw, spin direction and wind sign. `bad` lists offending particles with
their blade-local coordinates when it does not.

## Brief

- What is happening? A windmill turns through a wind-driven cloud sky.
- Single visual idea: its sails drag visible material out of air that looked
  empty — the cloud is already there, and the blades are what reveal it.
- What matters most? The cloud, depth, wind, and rotation must read as one
  relationship.
- What can be ignored or collapsed? Surface detail outside that interaction.
- What relationship or motion must read? The windmill's rotation affects the
  cloud rather than merely playing in front of it.

## Local rules

Keep the postcard self-contained and asset-free at runtime. Keep supplied source
material in `references/`, never load it from `index.html`, and preserve the
existing controls and export/config behavior unless the change explicitly
concerns this postcard.

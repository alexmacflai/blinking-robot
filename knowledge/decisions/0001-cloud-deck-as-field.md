# 0001 — The cloud deck is a field, not a particle system

`[decision]` `[decision-record]` `[procedural-rendering]` `[performance]`

**Status:** superseded in part by
[`0002`](0002-sail-cloud-interaction-as-emitter.md) · applies to
[`gallery/postcards/windmill`](../../gallery/postcards/windmill/)

> **What still stands:** the deck is a flat field, not a particle system, and
> the reasoning below for why grain belongs at the silhouette rather than in
> the bulk. **What 0002 reversed:** the carve field and the debris pool. The
> deck no longer interacts with the sails at all; that moved to an invisible
> particle medium in the depth slot behind it. Everything below about carving,
> deposition, shred quantisation and tear-depth falloff describes code that has
> been removed.

## Context

The windmill postcard has four cloud layers. Three are density fields: a lobed
silhouette filled with one flat tone at full opacity. The fourth — the one the
sails plough through — was 62,000 simulated particles.

That made it the only layer that modulated **both** alpha and tone by local
particle density, so it alone read as semi-transparent and blotchy while the
other three read as solid cloud. Successive attempts to fix the look by tuning
density, clumping and tone range kept trading one problem for another: enough
opacity to look solid flattened the clumping into an even screen, and enough
transparency to show the clumping made it look see-through.

## Decision

The deck became the same kind of object as its neighbours — a lobed surface
filled with one flat tone — plus two additions:

- a **carve field** recording where the sails have torn cloud away, stored in
  the deck's own scrolling *material* coordinates;
- a small **debris pool** for cloud that has actually been thrown, spawned from
  the torn mass and deposited back into the carve field where it lands.

The bulk is now flat. All the structure lives in the silhouette and in what the
blades take out of it.

## Why

**Grain in the bulk reads as sand; grain at the silhouette reads as cloud.**
That is the whole insight. The particle deck put its texture in the interior,
which is exactly where real cloud has none.

Three properties fall out of the design rather than being tuned in:

- **Material coordinates.** Scrolling is an offset, never a resample, so scars
  never smear — and a scar travels downwind with the cloud that owns it, so the
  mill leaves a wake of torn cloud drifting away from it.
- **Carving through the sails' own rasteriser.** The hole lands exactly where
  the blade is drawn, rather than where an unprojected rotor would have been.
  The old particle physics used a frontal rotor while the rendering used a 3/4
  one; that mismatch was invisible with soft particles and would not have been
  with hard-edged holes.
- **Deposition rather than fade-out.** Torn cloud is put back where it lands.
  Fading would leave tearing and healing as two independent rates that have to
  be hand-matched, and any mismatch quietly bloats or evaporates the cloud over
  minutes. Depositing makes the system self-balancing; measured `carvedMean`
  held at 0.060–0.063 across three minutes of simulation.

Two behaviours were deliberate and are worth not "simplifying" away later:

- **Tearing falls off with depth below the surface.** Without it the sails
  hollow out the inside of the deck and the sweep becomes one bald disc — a
  punched-out cutout. Skimming the top scallops the silhouette instead.
- **Torn cloud is quantised into shreds.** Mass accumulates until there is a
  chunk's worth and then leaves in one piece. A continuous drizzle reads as
  sanding; discrete pieces read as tearing, and the interval between them
  varies on its own with how thick the cloud is where the blade is cutting.

## Costs and consequences

- The deck no longer has interior texture. That is the point, but it means the
  layer is only as interesting as its silhouette and its scars.
- A carve field is state that must scale with the grid. `bite` and shred size
  are measured in carve units, which accrue per cell, so both scale with
  **area** — without that a finer grid would tear more often and throw more
  pieces for the same scene. Verified at 8.9 shreds/second across every grid
  from 117×208 to 360×640.
- Long streaks of wind-blown grit, previously a side effect of the particle
  field, now need an explicit minority population of wisps that never deposit.

Performance improved substantially as a side effect: roughly 4.3 ms/frame to
1.2 ms at the default grid, and 10.7 ms to 2.2 ms at 360×640.

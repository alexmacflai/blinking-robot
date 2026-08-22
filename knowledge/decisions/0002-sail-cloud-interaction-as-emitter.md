# 0002 — Sail–cloud interaction lives in one invisible particle medium

`[decision]` `[decision-record]` `[procedural-rendering]` `[invariant]`

**Status:** accepted · applies to [`gallery/postcards/windmill`](../../gallery/postcards/windmill/)

**Supersedes in part:** [`0001`](0001-cloud-deck-as-field.md). The half of 0001
that made the deck a flat field instead of 62k particles still stands and is
the reason the deck looks like cloud. The half that gave it a carve field and a
debris pool is reversed here.

## Context

0001 left the deck as the layer the sails tear. A later change added a fifth
cloud — an invisible particle medium in the third depth slot — as the thing the
blades interact with, but did not retire the deck's carve field and debris pool.
Both then ran at once, as two independent "sails tear cloud" mechanisms.

Measured with both live: the deck contributed **51 grains in flight and 20k
shreds total** against the medium's **8,673 lit and 550k reveals** — about
**0.4%** of the airborne material, while still carving the deck underneath it
and costing a per-frame field diffusion pass.

That is the failure mode this record exists to name: a replacement was built
and the thing it replaced was left wired in. It did not look broken, because
the new mechanism visually swamped the old one. It was found by someone reading
the layer table and asking why the deck was still the layer that tears.

## Decision

The L2 deck is **inert**. It is an ordinary bank, like L1/L3/L4: a lobed
surface filled with one flat tone, with no carve field, no healing, no tearing
and no debris. Roughly 220 lines and the entire `CFG.debris` block are gone.

All sail–cloud interaction happens in the fifth cloud, and only there.

## Why

**One mechanism, or the weaker one becomes invisible drag.** Two systems
answering the same question do not average out; the louder one wins the frame
and the quieter one persists as cost plus a slow, unattributable divergence
between what the code says and what the image shows.

The emitter medium is the better of the two on its own merits:

- **Contact and reveal are the same event.** A particle cannot appear without
  having been touched, nor be touched without appearing. The deck's version had
  a threshold, a probability roll and a deposition path between the blade and
  the visible result, each of which could be tuned into disagreeing with the
  others.
- **The no-overlap invariant is enforceable.** A particle is never inside a
  blade, as a *positional* constraint applied at render time in the projected
  rotor space, not a force. Forces cannot express this: a particle is inside
  the blade for exactly as long as a force is pushing it out. `__mill.emit()`
  reports `insideBlade`, which must read 0 — verified across grids 99×176 to
  432×768, yaw 0°/35.5°/60°/−40°, both spin directions and both wind signs.

## Costs and consequences

- **The deck no longer reacts to the mill at all.** Its silhouette is smooth
  and unbroken; the scalloping the blades used to cut is gone. This was chosen
  knowingly over keeping the carve field for its silhouette alone.
- **The lower half of the rotor sweep does nothing visible.** The medium sits
  in depth slot 3, behind the deck, so reveals below the deck surface are
  occluded. What reads is material flung *above* the deck line. Moving the
  medium in front of the deck is a one-line change to draw order if that trade
  is ever judged wrong.
- **Throughput has a hard ceiling.** The rotor sweeps x −4..224 in a 234-wide
  frame, so there is no upwind reservoir: once the medium already in frame is
  eaten, the rate is fixed at `density × band height × drift speed`. Only
  `emit.density` moves it; `emit.output` merely over-feeds the incoming edge.
  This is why the animation must warm up *with* the reveal pass running —
  otherwise frame one opens on a pristine, fully packed medium, the first
  sweeps harvest a whole frame of area at once, and the burst collapses to the
  sustainable rate a few seconds in.

Performance: 0.22 ms/frame of simulation to 0.15 ms, at a medium of ~21k
resident particles and ~6k lit.

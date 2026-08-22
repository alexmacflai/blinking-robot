# Passing legs postcard

## Purpose

The camera lies on the floor, looking along it. Legs pass in formal trousers and
shoes, in four depth ranks, at four cadences, and never stop. There is nothing
above the knee. Nobody arrives, nobody is recognised, nothing happens.
Procedural, self-contained, no external assets.

## Boundaries

- **In scope:** this scene, its projection, its walk cycle, its traffic, and
  the separation rule that keeps the ranks readable.
- **Out of scope:** shared runtime extraction, gallery navigation, and
  product-wide visual rules.

## Context

`[postcard]` `[passing-legs]` `[procedural-rendering]` `[1-bit]` `[dither]`
`[motion]` `[animation-controls]` — one still world with an indifferent crowd
crossing the top of it.

## Handbook

Open [`index.html`](index.html) directly to view the clean, gallery-facing
postcard. Open [`controls.html`](controls.html) to tune the same scene with its
maker-facing panel; its values are session-only and **SAVE VALUES** exports the
whole `CFG` for pasting back into source.

[`references/README.md`](references/README.md) records the source material
supplied for this postcard — which is none. It was built from the written seed
alone, and that README says what follows from that.

**This postcard does not loop, and that is the point.** The windmill and the
coffee both return to their own first frame; see the
[catalogue](../../../knowledge/design/visual-language.md) for why the coffee's
cycle is its subject. Here walkers are spawned at a randomised cadence, cross,
and are destroyed. There is no period to return to and nothing accumulates, so
there is nothing to drift. `warmup()` runs the traffic for thirty seconds before
the first visible frame — without it the postcard opens on an empty floor and
fills up, which is a beginning, and this scene must not have one.

**The projection is one-point perspective and almost nothing else.** The camera
sits at `cam.height` above the floor with a horizontal axis, so the floor plane
images as a single horizontal line and a walker at depth `d` is drawn at a
uniform `focal/d` pixels per metre. Within a rank there is no perspective at
all; between ranks there is nothing but scale. One consequence is load-bearing:
every rank's shoes land within about six pixels of each other. The floor is a
line, not a plane, and depth therefore has nowhere to go but **scale, tone and
cadence**.

**`horizon` sets the composition, and once the crop constraint is folded in
there is only one number to trade.** Visible leg length is
`horizon * hip / (hip - camera height)` pixels — about `1.12 * horizon` — and
the floor gets whatever is left. Raise it for a tighter crop and bigger legs;
lower it for more, smaller legs under more floor. The stride is fixed by the
leg and does not shrink to make room: at the near rank one stride spans about
200 of the frame's 234 pixels, so a near walker is often wider than the frame.
That is what a floor-level close-up actually looks like.

**There is no torso, and the frame does the cropping.** The focal length is not
chosen for a look, it is solved so that the hip of the farthest *and shortest*
walker still sits above the top edge:

    scale >= horizon / (hip * (1 - fig.vary) - camera height)

A waist with nothing above it reads as an amputation rather than as a crop, so
this is an invariant, not a preference. The controls readout prints each rank's
hip y and flags any that has stopped being negative.

**Two silhouettes of the same rank are the same value.** A rank has exactly one
tone — that is the depth cue, applied without exception — so where two of them
overlap they merge into one unreadable mass, and a walker's own two legs overlap
on every stride. `capT()` and `quad()` therefore take an `only` argument: given
a rank's tone they write **only over pixels already at or below it**, which is
material of that rank and nothing else. Painting a lighter value through that
filter puts a rim exactly where two same-value silhouettes would have merged,
and nowhere else — not against the background, not against the floor, not
against a farther rank. It needs no bookkeeping, because the buffer already
knows what is underneath. Set **separation → lift** to zero on the controls page
to see what it is doing.

**The foot is planted in the world and the hip walks past it.** That is the
whole gait, and it is the opposite of driving a foot along a path relative to
the body — which is what makes a coded walk read as amateur. `plant()` returns
the world x the sole occupies for an entire stance, and the hip term cancels
exactly, so the no-slip guarantee is a property of the algebra rather than
something tuned. Everything else follows from it:

- **The foot rolls.** It lands toe-up on the heel, flattens, and then the heel
  lifts and it pivots about the toe. A foot held flat through stance and dipped
  in swing is backwards at both ends, and it is the loudest tell in a bad walk
  cycle. The pivot moving to the toe is also what carries the ankle *up* at
  push-off, which is what keeps the trailing leg within reach of the hip.
- **Swing hits both contact poses exactly**, so nothing slips on take-off or
  landing, with a small clearance over the middle and `tuck` pulling the ankle
  toward the hip early. That tuck is one pose — the knee flexing hard just after
  toe-off — and it is the single thing that separates walking from marching.
- **`fig.hip` and `gait.step` are solved together, not chosen.** Thigh + shin +
  ankle is 0.925m, and a hip below that can never straighten its own leg: the
  walker then crouches through the entire cycle. Both are set so that mid-stance
  and heel strike sit at 98% of leg length. Shorten the step and the walker
  minces on bent knees; lengthen it and the IK clamp starts dragging the foot,
  which is a slip. The binding moment is **not** heel strike but `p ≈ 0.08`,
  during the roll from heel onto a flat foot, where the ankle is still
  descending and the hip has not yet risen — peak extension there is 99.3%
  against a clamp at 99.5%. Both figures are on the controls readout.

`__legs.run(sec)` advances the traffic without waiting for it, which is how you
look for a crossing rather than sitting through one; `__legs.state()` reports
each rank's population and lateral positions.

## Brief

- What is happening? Legs walk past a camera lying on the floor.
- Single visual idea: a wall of anonymous legs that occasionally, briefly,
  assembles into a body that isn't there.
- What matters most? That depth reads from value and cadence rather than from a
  receding floor, and that the awkward overlap is allowed to happen rather than
  staged.
- What can be ignored or collapsed? Everything above the knee, the room, the
  light source, and any individual.
- What relationship or motion must read? Different rhythms at different depths,
  crossing.

## Local rules

Adjacent ranks are given opposing direction bias on purpose: walkers going the
same way almost never cross, so without a counter-stream the overlap this scene
is about would simply not occur. Keep the floor pale — a large area near mid
luminance is a large area of 50% stipple, which reads as noise rather than as a
surface. There is no cast shadow under a foot: every rank's shoes land within a
few pixels of the same line, and that shared contact line is what fastens them
to the floor — a shadow only competed with it and made the sole ambiguous. Keep
both surfaces self-contained and asset-free at runtime, and keep development
controls out of `index.html`.

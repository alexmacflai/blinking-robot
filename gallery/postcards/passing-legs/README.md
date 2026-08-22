# Passing legs postcard

## Purpose

The camera lies on the floor, looking along it. People pass in formal trousers
and shoes, in four depth ranks, at four cadences, and never stop. Nobody
arrives, nobody is recognised, nothing happens. Procedural, self-contained, no
external assets.

## Boundaries

- **In scope:** this scene, its projection, its gait, its traffic, and the
  separation rule that keeps the ranks readable.
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

**`horizon` is the composition's only real lever, and it trades two things
against each other.** The share of the frame above it that a figure spends on
coat rather than leg is `1 - 0.81*scale/horizon`, and the number of figures
that fit across the far rank is about `474/horizon`. Lower it and the crowd
gets denser and leggier under a bigger floor; raise it and you get a few large
walkers under a curtain of coats. The controls page prints both, per rank.

**`fig.coatTop` is a drawn extent, not a body height.** The silhouette must run
off the top of the frame: cut at the hip it reads as an amputation, and cut any
lower it acquires shoulders and becomes a picture of a person, which the brief
rules out. `coatTop` is what guarantees the crop, it is always off-frame, and
holding it at an anatomical 1.5m forces a focal length at which one walker is a
third of the frame wide. Raising it is what lets the crowd be a crowd. The
controls readout warns when a rank's coat top is no longer negative; if it is,
that rank is being cut inside the picture.

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

**The cadence is derived, not set.** One gait cycle is `2*step/speed` seconds
and the stance carries the foot backward across `2*duty*step`, which is exactly
the distance the body advances while that foot is down. Set a period directly
instead and the feet skate. The hip drop at double support is not decoration
either: without it the leg cannot reach the end of its own stride and the foot
slips.

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
- What can be ignored or collapsed? Everything above the hip, the room, the
  light source, and any individual.
- What relationship or motion must read? Different rhythms at different depths,
  crossing.

## Local rules

Adjacent ranks are given opposing direction bias on purpose: walkers going the
same way almost never cross, so without a counter-stream the overlap this scene
is about would simply not occur. Keep the floor pale — a large area near mid
luminance is a large area of 50% stipple, which reads as noise rather than as a
surface, and the contact shadows rather than the floor tone are what fasten a
walker to the ground. Keep both surfaces self-contained and asset-free at
runtime, and keep development controls out of `index.html`.

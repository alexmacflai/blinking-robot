# Coffee postcard

## Purpose

An espresso machine pours into a cup that is already full. The stream ripples
the surface and pushes coffee over the rim; the spill runs down the cup, spreads
on the tray and leaves the frame. The pour stops, the surface settles, and the
cup is full and still again — then it starts over. Procedural, self-contained,
no external assets.

## Boundaries

- **In scope:** this scene, its projection, its renderer, and the pour cycle.
- **Out of scope:** shared runtime extraction, gallery navigation, and
  product-wide visual rules.

## Context

`[postcard]` `[coffee]` `[procedural-rendering]` `[1-bit]` `[dither]` `[motion]`
— one still world where the same cup is filled forever and never empties.

## Handbook

Open [`index.html`](index.html) directly to view the clean, gallery-facing
postcard. It contains only the animation. Open [`controls.html`](controls.html)
to tune the same scene with its maker-facing panel; its values are session-only
and are copied back into source with **COPY CONFIG** or **SAVE VALUES**, which
emit the whole `CFG` block. **SEEK** replays the cycle from a clean cup to the
chosen second, which is the only honest way to inspect a moment: setting the
clock alone would show the right phase with the wrong spill and ripple state.

[`references/README.md`](references/README.md) records the source material
supplied for this postcard. It informs the scene but is never loaded by it.

**The projection is the load-bearing decision.** Everything is placed in a
symmetric dimetric world (`+x` right-and-down, `+y` left-and-down, `+z` up) and
projected by two constants. That is what lets the cup, its rim, the coffee, the
ripples and the spill pool on the tray all be drawn as plain ellipses and still
agree about one ground plane: the ellipse ratio is *derived* from the projection
(`ELLX`/`ELLY`), never chosen by eye, so a ground-plane ellipse cannot disagree
with a box face about the plane they share. The machine housing is centred on
the **cup's** axis rather than the frame's, which in this projection means
`(bx0+bx1)/2 - (by0+by1)/2` must equal `wx - wy`.

**Two value rules do most of the reading**, and both are conventions of this
postcard rather than a lighting model:

- **Coffee is dark on a surface and bright in the air.** The stream, the
  residual drops after it breaks, and the drips leaving the tray are all bright;
  the crest over the rim, the rivulets down the cup and the pool on the tray are
  all ink. Drawn the other way round, the falling coffee is invisible against
  the background and the spilled coffee is invisible against the cup.
- **The cup body is a flat mass, not a round gradient.** A full gradient
  dithers into vertical bands, and the overflow running down the cup is *also*
  vertical bands — the two become the same mark and the cup reads as striped
  crockery. `cupShade` keeps the body near-solid and pushes the fall-off into
  the last third, so a dark vertical stripe on the cup can only mean coffee.
  `roundShade` still does the ordinary thing for the machine's cylinders.

**The overflow is drawn as one connected thing.** A crest band lies over the
front arc of the rim whenever coffee is going over, and the rivulets hang off
it. Without the crest the rivulets start out of nowhere below a clean bright
rim, and the image loses the only event it is about.

**The cycle is phase-driven, with no accumulating state.** One clock modulo one
period drives the pour envelope, the ripple amplitude, the rivulets and the
pool, and the cycle wrap resets the rivulets. This is why the cup can be
guaranteed full and still at the start of every cycle rather than drifting.
The one deliberate carry-over is the tray: the pool drains but does not
necessarily reach zero, so the tray stays faintly wet — the spill leaves the
frame instead of being tidied away.

Ripples answer to the stream *landing*, not to the pour starting; the tip has to
fall from the spout first, or the surface reacts to nothing. They are shaded by
the wave's **slope**, not its height, because a 1-bit surface can only show a
gradient as where the light catches it.

`__coffee.seek(sec)` replays the cycle from a clean cup up to `sec` and renders
that frame; `__coffee.play()` resumes. Setting the clock alone would show the
right phase with the wrong spill and ripple state.

## Brief

- What is happening? An espresso machine fills a cup that is already full.
- Single visual idea: perpetual overflow without loss — the cup never rises and
  never empties, and the coffee that goes over the side simply leaves.
- What matters most? That the machine visibly *causes* the ripples and the
  overflow, and that the cup is calm and full again before the next pour.
- What can be ignored or collapsed? The machine. It is two cropped faces, a
  group head and a portafilter — enough to be recognised, and no more.
- What relationship or motion must read? Pour → ripple → over the rim → down
  the cup → off the tray, as one chain of consequence.

## Local rules

Keep this surface self-contained and asset-free at runtime. Keep supplied source
material in `references/`, never load it from either HTML page. The public
postcard must stay free of development controls.

Two controls can break the postcard's premise and are worth knowing about:
**pour** longer than **period** never lets the surface settle, so the cup is
never still; and a low **dry speed** leaves the streaks on the cup when the next
pour starts, so it stops reading as a fresh cup each time.

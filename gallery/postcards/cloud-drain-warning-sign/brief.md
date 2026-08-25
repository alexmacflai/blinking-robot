# Cloud-drain warning sign brief

Source: [ticket #15](https://github.com/alexmacflai/blinking-robot/issues/15).
References: [`references/README.md`](references/README.md).

## Brief

- What is happening? A standard European triangular warning sign, on a pole,
  stands alone above a sea of clouds that is continuously draining inward and
  downward around it, like water leaving a plughole.
- Single visual idea: an ordinary, indifferent municipal object presides over
  something that reads as cosmic and slightly alarming, and neither register
  resolves the other.
- What matters most? The spiral's legibility as one continuous twisting mass
  with position-dependent depth, the sign's total structural indifference to
  it, and the quiet, event-free disappearance at the centre.
- What can be ignored or collapsed? Any sense of place below or around the
  cloud sea, sign material detail beyond triangle/pole/pictogram, and any
  explanation of why this is happening.
- What relationship or motion must read? Unmoved sign above steadily draining
  cloud material — one relationship, read from a camera slightly above the
  sign looking down into the whirlpool.

## Indexed colour treatment

The postcard is authored as one continuous value field, monochrome only for
this first version (ticket direction; accent-slot decisions are deferred).
In 1-bit the field becomes ink/paper through ordered dithering. The sign
face's pictogram is drawn as geometry with its own value, not as a bitmap or
a screen-space mask, per [`rendering.md`](../../../knowledge/design/rendering.md#palette-and-indexed-colour).

## Design position (rule 13)

- **Art direction** ([`art-direction.md`](../../../knowledge/design/art-direction.md)):
  one clear visual idea (indifferent sign over draining cloud), large simple
  masses, generous negative space, subject small in frame. This rules out the
  sketch's flocks-of-birds and lightning variants (`references/IMG_2181.jpeg`)
  — both add a second event and push the scene toward spectacle/storm, which
  the ticket and `art-direction.md`'s "avoid fantasy grandeur, spectacle" both
  reject. Dropped.
- **Motion** ([`motion.md`](../../../knowledge/design/motion.md)): motion
  exposes one relationship rather than decorating the frame; stillness is an
  active choice. The sign and pole stay structurally still; only cloud
  material moves. The sketch's "maybe the drain or wind pulls the sign a bit"
  (`references/IMG_2181.jpeg`) is capped by the ticket's explicit constraint
  — sway is allowed only if it never implies the drain is pulling the sign —
  so pole sway is kept optional, small, and framed in values as wind-driven,
  not drain-driven.
- **Rendering** ([`rendering.md`](../../../knowledge/design/rendering.md)):
  shades establish depth; a lighter/darker stroke separates same-value
  neighbours already in front of each other. This is the direct source for
  the acceptance criterion that the spiral's upper/lower portions and depth
  stay distinguishable — tone must be a function of position on the spiral
  (angle/radius/depth), not a flat fill.
- **Visual-language catalogue** ([`visual-language.md`](../../../knowledge/design/visual-language.md)):
  no existing entry covers a field draining toward a point, so nothing is
  reused wholesale. Two entries inform the approach without being copied:
  windmill's *rotating form tears a cloud field* (source: treat cloud as one
  continuous field, not discrete objects — reused for the base cloud
  representation, along with windmill's unbounded, non-resetting time driver
  for continuous rotation rather than a spawn/destroy population).
  If the drain's field-toward-a-point technique proves reusable elsewhere, it
  should be added to the catalogue as a new entry rather than folded into
  either existing one.
- **Discarded from the sketches**: the spiral drawn directly on the sign face
  (`references/IMG_2180.jpeg`) is an alternate pictogram concept the ticket
  supersedes with the fixed reaching/drowning hand; not used. A visibly
  crooked pole (`references/IMG_2181.jpeg`) is kept as a small, near-zero-
  default authoring control rather than a baked-in pose, since a permanent
  crook reads as a decision about the sign rather than the restrained wind
  sway the ticket allows.

## Gallery writing

Deadpan, bureaucratic-sounding. Do not explain the symbolism or resolve
whether the scene is comedic (ticket requirement).

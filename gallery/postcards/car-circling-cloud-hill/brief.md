# Car circling a cloud-covered hill brief

Source: [ticket #23](https://github.com/alexmacflai/blinking-robot/issues/23).
References: [`references/README.md`](references/README.md).

## Brief

- What is happening? A rounded hill stands between two layers of cloud. A road
  wraps around it from the hidden rear, climbs to the summit past a small
  house, crosses over, and runs down the front face toward the viewer. Cars
  come up out of nowhere behind the hill, cross the top, come down the front,
  and are gone into the near cloud.
- Single visual idea: an ordinary procession of traffic completing a strangely
  isolated journey around a hill suspended in the clouds.
- What matters most? That the route is one continuous climb-and-descent, and
  that the hill and the clouds genuinely hide the parts of it they should. The
  road is the only mark on the hill and must stay the thing the eye follows.
- What can be ignored or collapsed? Everything under the cloud, the far side of
  the hill, car interiors and occupants, road furniture, and any account of
  where the road comes from or goes.
- What relationship or motion must read? Sparse traffic passing over a still
  landform — the hill and the cloud layers do the occluding, so the depth of
  the scene is stated by what disappears rather than by shading.

## Car construction

The car construction follows the supplied [car reference](references/br-car.png).
It is one 3D object made from separate body and cabin pieces. The body is
tapered, with the narrow end defining the front. The cabin is trapezoidal and
rear-biased on the body, with inset window panes on both side faces and the
front face.

Every car has four wheels, two per side. Each wheel is an extruded cylinder
whose axis runs across the car. The wheels are partly embedded in the lower
body, and far-side wheels obey natural 3D occlusion.

The car has two small circular lamps on the front face. This construction
section is limited to the confirmed body, cabin, windows, wheels, and lamps;
headlight behaviour, variable sizing, and vertical bobbing are documented
separately.

## Variable size

The variable-size requirements follow the supplied [car reference](references/br-car.png).
Body and cabin dimensions vary per car rather than being applied as one
uniform car-size operation. Body length and height may vary independently, and
cabin length and height may vary independently, so the body and cabin may use
different length and height values on the same car. Body and cabin widths vary
together and remain linked.

Each car receives stable, deterministic body and cabin dimensions within the
exposed authored ranges. When body height changes, the cabin moves vertically
by the exact body-height difference so its attachment remains intact. Wheels
and lamps reposition with the resized construction but do not resize as part
of body and cabin variable sizing. Windows reposition and resize to remain
attached to the resized cabin.

The separate full-car scale property is for composition and road fit. It
scales the entire constructed car — body, cabin, wheels, windows, and lamps —
while preserving their proportions and attachment relationships.

The starting authored limits, in the existing scene/world-unit system, are:

- Base car size: `2`–`24`
- Body width ratio: `0.25`–`1.00`
- Body height ratio: `0.20`–`1.00`
- Per-car deterministic size variation: `0`–`0.60`

These are authoring limits rather than immutable visual constants and may be
tuned through the controls page. Headlight projection and vertical bobbing
remain separate requirements.

## Headlights

The headlight requirements follow the supplied [headlight reference](references/br-carLights.png).
Both headlights remain on continuously. Each lamp emits a widening cone that
originates at the lamp and points along the car's forward axis. The beam is
projected into the 3D scene and lands on whichever surface is first in front
of it: the road or the hill. It stops at that first surface rather than
passing through scene geometry.

The projected light reads as a graphic tonal cone compatible with the
postcard's indexed and dithered rendering. It is part of the car's 3D
construction and follows the car's position and orientation. This section
documents headlight behaviour only; car construction, variable sizing, and
vertical bobbing remain separate requirements.

## Bobbing movement

The vertical bobbing requirement follows the supplied [car reference](references/br-car.png).
Every car has a short, quick, repeating vertical bob while travelling. The
movement is continuous rather than a one-time jolt, and each car uses an
independent stable deterministic phase so the cars do not bob in sync. The
vertical bob has separate exposed amplitude and speed controls.

Every car also has a slow lateral sway across the road. The sway has a loose,
boat-like pendulum character and is separate from the car's forward travel
along the road. It has separate exposed amplitude and speed controls, and each
car uses the same independent stable timing principle as its vertical bob.

Bobbing applies to the car construction as a whole while preserving the
relationships among the body, cabin, windows, wheels, and lamps. It does not
add body roll or combined tilting: the sideways movement is lateral translation
only. This section documents movement behaviour only; car construction,
variable sizing, and headlight projection remain separate requirements.

## Indexed colour treatment

The scene is authored as one continuous value field and quantized once at the
end, per [`rendering.md`](../../../knowledge/design/rendering.md#palette-and-indexed-colour).
In 1-bit the field becomes ink and paper through ordered dithering. In 2-bit,
the cloud layers are restricted to slots 0, 1, and 3 so the accent never
spreads through a cloud mass; palette slot 2 is reserved for car bodies and is
issued to every *n*th car only, with `car.accentEvery` defaulting to 0 — off.
A procession of coloured cars would make the traffic the spectacle rather than
the ordinary thing it is meant to be, so the accent is left as an authoring
lever rather than a default.

## Design position (rule 13)

- **Art direction** ([`art-direction.md`](../../../knowledge/design/art-direction.md)):
  large simple masses, strong negative space, one clear idea. The hill is one
  mass, the cloud layers are two, and the cars are small in frame for most of
  the route. Recognition threshold decides the level of information: a car is
  a box with a cabin, and it only earns wheels once it is large enough on
  screen for them to be more than a stray pixel. Impossible things stay
  ordinary — nothing in the scene remarks on the hill being in the sky.
- **Motion** ([`motion.md`](../../../knowledge/design/motion.md)): motion
  exposes one relationship and stillness is an active choice. Cars and the
  chimney's smoke move; the hill, road, and house body stay still. Cloud drift
  is exposed as minimum and maximum wind controls because the direct cloud
  movement instruction requires the four depth layers to move at interpolated
  speeds.
- **Rendering** ([`rendering.md`](../../../knowledge/design/rendering.md)):
  shades establish depth, and a same-value neighbour needs a stroke to stay
  separate. The hill is deliberately a near-flat mass with its fall-off pushed
  to the silhouette, so the road stripe is the only mark on it and cannot be
  confused with shading. The cloud layers are tone-separated from the hill and
  from each other so the hill reads as being between them.
  The cloud distribution is four explicit groups — two behind and two in
  front — with distinct night values. Each front group has its own group-level
  mask that ramps from `0.7` at the upper edge to `1` at that group’s hard
  boundary and below, so the hill and traffic remain legible through the cloud
  group. The cloud silhouettes stay sharp: no blur, feathering, or per-lobe
  holes. Each front group exposes its own authored mask size so the ramp can
  be made shorter or longer—even across the full rectangular cloud body—without
  combining the masks.
  All four cloud groups follow one broad shallow arc: the group centre sits
  lower than its sides, while the individual lobes remain upright and sharp.
  The arc also applies to each group’s continuous wall/floor and follows the
  moving bank, so it does not shear against the wind. Each front mask samples
  the same moving arc profile as its own cloud group.
  Cloud movement follows depth: the rear uses the minimum wind, the front the
  maximum, and the middle groups interpolate between them.
- **Visual-language catalogue** ([`visual-language.md`](../../../knowledge/design/visual-language.md)):
  - *Flat mass so a mark can only mean one thing* (Coffee) is reused directly
    and is the reason the hill is not shaded as a dome. The condition holds:
    the hill's form is given by its silhouette, and the road is a mark on it
    that shading bands would compete with.
  - *A scene with no cycle to return to* (Passing legs) is reused in spirit —
    traffic, not an event — but not in implementation. Passing legs owns
    nothing that persists; here the cars ride a fixed path and are indexed by
    a wrapped phase, so the scene is bounded like the drain's rather than
    spawned like the walkers'. Car identity is hashed from the wrap count, so
    the procession does not visibly repeat while nothing accumulates.
  - *A rim drawn only where two equal values touch* (Passing legs) was
    considered and declined. Its condition is that same-value overlap is
    frequent and genuinely ambiguous; here the hill is always in front of the
    clouds behind it and always behind the clouds in front of it, so the
    separation is a fixed relationship and an unconditional rim shade is the
    honest answer.
  - *Rotating form tears a cloud field* (Windmill) is not reused — nothing
    here touches the clouds — but the windmill's **puff and sea cloud banks**
    are, because the sketch's clouds are exactly that: scalloped masses with a
    continuous floor. The implementation is kept local per rule 11.
  - *One body whose shape is the motion* (Cloud-drain) is not applicable: the
    cloud here is a passive occluding layer, which that entry explicitly names
    as the case for a field instead.
- **Depth**: the hill, road, house, and cars are real geometry projected
  through one camera and resolved by a depth buffer. This is not decoration —
  every acceptance criterion about occlusion is satisfied by construction
  rather than by ordering sprites. The road is offset outward along the hill's
  own surface normal, so the stretch of it on the far side is hidden by the
  hill for the same reason the cars there are.
- **Discarded from the sketch**: the sketch's third panel crops much closer
  to the descending car; the established framing is the first panel's, and
  the ticket's composition notes follow it.
- **Reversed by direct instruction**: the smoke plume was originally kept
  static — a second moving thing would compete with the car, the postcard's
  one relationship to watch. That was overridden explicitly: the plume is now
  a continuous rising stream (a wrapped phase per puff, the same mechanism
  the traffic uses, so nothing pops in or out and nothing accumulates).
  `house.smokeHeight` at 0 still removes it entirely.

## Gallery writing

Brief and deadpan. Describe the route. Do not explain why the hill is in the
clouds.

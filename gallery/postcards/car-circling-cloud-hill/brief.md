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
  exposes one relationship and stillness is an active choice. Only the cars
  move. The hill, road, house, and cloud layers are still; cloud drift is
  exposed as a control but defaults to zero, because a drifting cloud would
  make the occluding layers read as weather rather than as the edges of the
  world.
- **Rendering** ([`rendering.md`](../../../knowledge/design/rendering.md)):
  shades establish depth, and a same-value neighbour needs a stroke to stay
  separate. The hill is deliberately a near-flat mass with its fall-off pushed
  to the silhouette, so the road stripe is the only mark on it and cannot be
  confused with shading. The cloud layers are tone-separated from the hill and
  from each other so the hill reads as being between them.
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
- **Discarded from the sketch**: the sketch's chimney smoke plume is kept but
  held **still**, as a graphic mark rather than an animation. A second moving
  thing would compete with the single relationship the postcard exists to
  show; a still plume keeps the house's mundane detail and the sketch's quiet
  joke of a chimney feeding the cloud above it. `house.smokeHeight` at 0
  removes it. The sketch's third panel crops much closer to the descending
  car; the established framing is the first panel's, and the ticket's
  composition notes follow it.

## Gallery writing

Brief and deadpan. Describe the route. Do not explain why the hill is in the
clouds.

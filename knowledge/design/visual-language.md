# Visual language catalogue

`[design]` `[motion]` `[rendering]` `[scene]`

This is a catalogue of visual and motion patterns that have proved useful in a
postcard and may transfer to another. It preserves judgement, not a component
library: a pattern is a starting point to assess against a new scene's brief,
perspective, composition, and mood.

## How to use this catalogue

Before creating or materially revising a postcard, search this catalogue and
existing postcard READMEs for overlapping tags, objects, materials, or
behaviours. Reuse a pattern only when it strengthens the new image's single
visual idea. Do not treat a successful technique as a universal style token.

When a scene establishes a transferable pattern, add a compact entry with:

- the source postcard;
- the effect or relationship that must read;
- the conditions that make it work;
- what can vary; and
- when it should not be reused.

Keep code inside a postcard until a second postcard actually needs the same
implementation. This catalogue may point to a source; it does not imply code
extraction.

## Rotating form tears a cloud field

**Source:** [Windmill postcard](../../gallery/postcards/windmill/README.md)

**Effect:** A rotating object makes its contact with a cloud layer visible by
tearing off only the cloud material its sails pass through. The rotation reads
as an event in the world, rather than a loop laid over a backdrop.

**Works when:** a stationary or slow-moving material field can receive a clear,
local consequence from a repeated motion. The consequence remains sparse
enough to preserve the field's large mass and the scene's stillness.

**May vary:** the material, the moving form, the amount of fragmentation, and
the direction or irregularity of the resulting motion.

**Do not reuse when:** the scene needs an intact, passive background; the
interaction would clutter the composition; or the motion should remain
deliberately isolated.

See the [cloud-deck decision](../decisions/0001-cloud-deck-as-field.md) for
the technical rationale behind this particular implementation.

## A cycle that returns to its own first frame

**Source:** [Coffee postcard](../../gallery/postcards/coffee/README.md)

**Effect:** Something irreversible happens — liquid goes over a rim, runs down,
and leaves — and yet the scene is identical at the start of every cycle. The
loop is not hidden; it is the subject. The contradiction (the cup never rises
and never empties) does the work that a narrative would otherwise have to.

**Works when:** the consequence can genuinely *leave the frame* rather than be
tidied away, and the composition is one still frame with an event inside it. It
depends on the cycle being phase-driven with no accumulating state, so the rest
position is guaranteed rather than approached.

**May vary:** the material, the event, the period, and how much residue is
allowed to persist between cycles — a little is what keeps the reset from
reading as a rewind.

**Do not reuse when:** the scene should show change over time, or when the
consequence would have to pile up in frame to be believed.

## Value split by state, not by light

**Source:** [Coffee postcard](../../gallery/postcards/coffee/README.md)

**Effect:** One material is drawn in two opposite values depending on what it is
doing: coffee is ink on a surface and paper in the air. Every falling form reads
against the dark ground and every spilled form reads against the lit object,
with no outlines and no extra shades.

**Works when:** the palette is two values and a material has to cross between a
dark ground and a light mass. It is a legibility convention, not a lighting
model, so it must be applied without exception or it reads as an error.

**May vary:** which state takes which value, so long as it follows the grounds
the material actually crosses in that scene.

**Do not reuse when:** the same material appears against both grounds in one
state, or when a scene's light is doing real work that this would contradict.

## Flat mass so a mark can only mean one thing

**Source:** [Coffee postcard](../../gallery/postcards/coffee/README.md)

**Effect:** A curved object is shaded as a near-solid mass with the fall-off
pushed to its edge, instead of as a full gradient. Ordered dithering turns a
smooth ramp into vertical bands; if the scene's *event* is also vertical marks
on that object, the two become indistinguishable and the shading eats the story.
Flattening the mass reserves the mark for the event.

**Works when:** an object carries a moving mark that shares an axis with its own
shading bands, and the object's form is already given by its silhouette.

**May vary:** how much of the width stays solid, and whether a light stroke is
needed to hold the silhouette against a same-value background.

**Do not reuse when:** the object's roundness is the point, or when nothing is
drawn on it that the banding could be confused with.

## A rim drawn only where two equal values touch

**Source:** [Passing legs postcard](../../gallery/postcards/passing-legs/README.md)

**Effect:** Overlapping shapes that share a value stay separate without being
outlined. A silhouette lays a lighter tone behind its own edge, but the write is
filtered to pixels **already at or below its own value** — so the rim appears
against material of its own kind and is invisible against the background, the
ground, or anything lighter. Nothing gains a contour it did not need.

**Works when:** depth or category is encoded as flat value, so same-value
overlap is both frequent and genuinely ambiguous, and the compositing buffer is
continuous luminance drawn back to front. It costs no bookkeeping: the buffer
already records what is underneath, so the filter is a comparison at write time
rather than a list of what overlaps what. It also resolves a shape against
*itself* — in the source postcard a walker's own two legs — which an outline
pass over a finished silhouette cannot do.

**May vary:** the width of the rim, how much lighter it is, and whether it is
applied to whole figures, to selected parts, or only to the nearer of two
overlapping forms.

**Do not reuse when:** the merging of two shapes is the intended reading, or
when a scene's values are already all distinct — the filter then never fires and
the extra pass is dead weight. It is also wrong where an object must read
against a *lighter* neighbour, which is the opposite problem and wants
[value split by state](#value-split-by-state-not-by-light) instead.

## A scene with no cycle to return to

**Source:** [Passing legs postcard](../../gallery/postcards/passing-legs/README.md)

**Effect:** The postcard never repeats. Subjects are spawned at a randomised
cadence from a seeded stream, cross the frame, and are destroyed. There is no
period, so there is no first frame to come back to and no accumulating state to
drift — the guarantee the coffee postcard buys with a phase-driven cycle is had
here by owning nothing that persists.

**Works when:** the subject is traffic rather than an event — something whose
whole character is that it does not resolve. It requires a warm-up run before
the first visible frame, or the scene opens empty and fills, which reads as a
beginning; and it requires a seeded generator, or a change to the motion cannot
be judged because the population changed underneath it.

**May vary:** the spawn cadence, how many independent streams run at once, and
whether their rates are related at all.

**Do not reuse when:** the image depends on a state being reliably reachable, or
when the loop itself is the subject — see
[a cycle that returns to its own first frame](#a-cycle-that-returns-to-its-own-first-frame),
which is the opposite decision made for the opposite reason.

## Plant the foot in the world and walk the body past it

**Source:** [Passing legs postcard](../../gallery/postcards/passing-legs/README.md)

**Effect:** A walk that reads as walking rather than as a figure marching on the
spot. The contact point is fixed in world space for the whole of a stance and
the body advances past it, so the foot cannot skate — the guarantee is algebraic
rather than tuned. The pose the eye actually checks is the **foot roll**: the
sole lands toe-up on the heel, flattens, then the heel lifts and the foot pivots
about the toe. A foot held flat through stance and dipped in swing is backwards
at both ends, and is the loudest tell of a hand-built cycle.

**Works when:** the limb is solved by inverse kinematics from a contact pose, so
the joint angles are consequences rather than keyframes. It carries one hard
constraint with it: the body's height and its stride are **not independent**.
A hip lower than the fully extended leg can never straighten, and the figure
crouches through every frame; a stride longer than the leg can reach drags the
IK clamp and reintroduces the slip the model existed to remove. Solve the two
together against leg length, and check the extension at the roll from heel onto
a flat foot — not at heel strike, which is not where the peak is.

**May vary:** cadence, stance fraction, the tilt at each end of the roll, and
how much the knee tucks after toe-off — that tuck is what separates walking from
marching, and a little too much of it becomes a goose-step.

**Do not reuse when:** the motion is meant to be mechanical, floating or
inhuman, or when the contact is not load-bearing in the image. A figure seen
from far enough away that the foot is a few pixels does not repay any of this.

## One body whose shape is the motion

**Source:** [Cloud-drain warning sign postcard](../../gallery/postcards/cloud-drain-warning-sign/README.md)

**Effect:** A single continuous object — one cloud — is wound into a spiral
and drains inward, shrinking, while something standing in it stays entirely
indifferent. The spiral is not a pattern applied to material; it is the
object's shape, and the motion is that object travelling through itself.

**Works when:** the form is built along a spine rather than drawn or sampled.
A centreline carries the geometry, and heavily overlapping lobes strung along
it give the body a silhouette, in the same way the discs inside a thick line
give it a stroke. The lobes must never read as separate objects: their count
is an implementation detail, and if they are visible as beads the technique
has failed. Lobe size follows the spine's radius, so the shrink toward the
centre is geometry rather than a fade.

Depth must be genuine perspective with back-to-front sorting, because the
payoff is the body occluding ITSELF where its near arc crosses its far arc.
That self-occlusion, plus the near arc projecting larger than the far, is what
separates an object in space from a pattern on a plane. Check the sign of the
camera pitch: the far rim must sit higher on screen than the near rim.

Two failed attempts preceded this one and are worth recording, because both
looked plausible in isolation. Drawing the drain as tonal bands gives flow
with no material and reads as a gradient. Replacing that with a warped noise
density field gives material with no volume and no space — still a flat plane
with a texture — and, because the warp wound coordinates outward without
bound, it destroyed its own precision and decayed into static after minutes.

**May vary:** the spine's tightness, descent, and number of turns; the body's
thickness, lump size and roughness; flow rate; and how much of the frame the
form occupies.

**Do not reuse when:** the material genuinely is a field of many things rather
than one object — that is the windmill's
[rotating form tears a cloud field](#rotating-form-tears-a-cloud-field). It is
also wrong where the form must be watched piece by piece, since a spine plus
lobes has no per-piece identity to track.

**Keep bounded:** every time-dependent quantity must wrap. The flow phase here
is taken modulo the spine's span and the noise is periodic, so the scene runs
on a fixed cycle and cannot drift or degrade however long it plays. Any
technique that advances a coordinate forever will eventually eat itself.

## Occlusion as geometry, not as draw order

**Source:** [Car circling a cloud-covered hill postcard](../../gallery/postcards/car-circling-cloud-hill/README.md)

**Effect:** A subject travels a route that goes behind the thing it is
travelling on. It is hidden for half its journey, appears over a shoulder,
crosses, and is covered again — and the depth of the scene is stated entirely
by what disappears, with no shading doing the work. The landform, the path on
it, and the subject are world-space forms put through one camera and resolved
by a **depth buffer**, so every "this covers that" is a consequence rather
than an ordering decision.

**Works when:** the route genuinely leaves the visible side, and the thing
doing the hiding is a form the camera can be given rather than a silhouette
already drawn. The path must be built as a strip offset outward along the
host surface's own normal — then the hidden stretch of path is hidden by the
same test that hides the subject, and no separate bookkeeping exists to
disagree with itself. Getting this right costs one z-test per pixel and
removes an entire class of "which layer is this in" decisions.

It pairs with **baking**: if the occluding world is still, rasterise it once
into a luminance/depth/coverage layer at build time and copy it in per frame.
The moving subject then costs only its own faces, and the cost of real
geometry stops being a reason not to use it. The tradeoff is a real one to
state — anything that changes the still world has to re-bake, so a controls
surface must know which of its dials are geometry and which are not.

**May vary:** the host form, the shape of the route, how much of it is
hidden, and whether the subject is one thing or traffic. Passive fields —
here the cloud layers — can stay flat 2D banks composited before or after the
depth pass; they do not have to join the buffer to occlude, they only have to
be on the correct side of it.

**Do not reuse when:** the scene is genuinely flat and its layering is a
graphic decision rather than a spatial one — a depth buffer then encodes a
truth the image does not have, and costs a projection per vertex to say
nothing. It is also the wrong tool where the occluder is a soft field with no
surface, which is the drain's
[one body whose shape is the motion](#one-body-whose-shape-is-the-motion): a
painter's sort on a smooth lane depth is what that needs, not a z-test.

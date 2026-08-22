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

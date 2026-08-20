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

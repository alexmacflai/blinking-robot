# Rendering

`[design]` `[rendering]` `[procedural-rendering]` `[1-bit]` `[dither]`

Rendering is a distinct layer of the work: 1-bit treatment, dithering, low
resolution, hard edges, palette, and related techniques. It must reinforce an
already strong image rather than compensate for weak composition.

## Light and depth

- Light may behave as a graphic shape; do not default to realistic cinematic
  lighting logic.
- Use shades to establish depth.
- When an object already sits in front of another object of the same shade,
  use a lighter or darker stroke to preserve the separation.

## Application

Choose the rendering treatment that supports the scene's masses, hierarchy,
and mood. Do not add texture, dither, palette variation, or edge detail merely
to make an image feel finished.

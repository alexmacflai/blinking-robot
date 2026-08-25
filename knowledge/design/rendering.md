# Rendering

`[design]` `[rendering]` `[procedural-rendering]`

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

## Palette and indexed colour

Every postcard keeps one continuous scene-value field until final rendering.
In 1-bit mode that value maps to ink and paper through ordered dithering. In
2-bit mode it maps to four ordered palette entries: darkest, middle, colour,
and brightest. A material may provide explicit one-bit and two-bit values when
the same object should read differently by mode; those values are written with
the object geometry, not as a separate final colour mask.

The colour entry is a value band, not a compulsory highlight. A scene brief
that uses it names the material and its mode-specific value. Never recover a
colour region by detecting a source colour or approximate it with screen-space
boxes or bands.

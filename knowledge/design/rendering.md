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

## Palette and accent

Every postcard keeps neutral luminance and accent coverage as separate final
rendering channels. In 1-bit mode neutral luminance maps to dark and light; in
2-bit mode it maps to dark, middle, and light, while the independent accent
coverage may replace the neutral output with the accent colour. This keeps a
scene legible in monochrome and lets palette changes recolour a running frame
without rebuilding its simulation.

Accent is a compositional field, not a compulsory highlight. A scene brief
that uses it names the accent-bearing object or field, whether it acts as a
local focus, dominant mass, or atmosphere, and the intended distribution.
Partial coverage may be graded, layered, blurred, or dithered; never recover
it by detecting a source colour. Avoid evenly scattered, mid-sized accent that
flattens the image’s hierarchy.

# Passing legs brief

- Legs cross above a camera lying on the floor.
- Anonymous legs should occasionally assemble into the suggestion of a body that
  is never shown.
- Depth must read through value and cadence rather than a receding floor.
- Everything above the knee, the room, the light source, and individual identity
  may be collapsed.

## Indexed colour treatment

The postcard is authored as one continuous value field. In 1-bit, that field
becomes ink/paper through ordered dithering. In 2-bit, it becomes palette
indices 0–3: ink, neutral, colour, paper. Visible shoe geometry uses palette
slot 2 in 2-bit and keeps its existing continuous tone in 1-bit. The material
value is depth-tested with the shoe geometry, so it moves with each step and
cannot become a detached or foreground-only accent layer.

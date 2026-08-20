# Production ideas

`[product]` `[idea]` `[workflow]`

Uncommitted ideas for producing reusable exports from animation postcards.

## Multi-frame postcard exports

**Status:** Seed

**Idea:** Run an export process for postcards that captures one PNG per second
of an eight-second animation, producing eight still exports for each postcard.
Explore repeat exports across pixel modes and perhaps colour palettes.

**Why it might matter:** Still exports make an animated work easier to share,
inspect, and reuse in contexts that do not play animation.

**Open questions:** Is eight seconds the common capture duration? How does each
postcard expose a deterministic export state? Which output combinations are
worth retaining rather than multiplying assets without purpose?

## Sharp enlargement

**Status:** Seed

**Idea:** Export at the postcard's low pixel resolution (for example,
240 × 400) and also at integer multiples so the image stays visibly pixelated
but sharp on large displays.

**Open questions:** Which source dimensions and integer scales become part of
the export contract? Are enlarged images generated at export time or displayed
with nearest-neighbour scaling?

**Constraint:** The final workflow must not weaken the repository's simple,
asset-free, directly runnable postcard experience without an explicit decision.

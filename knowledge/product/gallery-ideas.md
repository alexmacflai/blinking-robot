# Gallery ideas

`[product]` `[gallery]` `[idea]`

Uncommitted directions for how visitors browse and hear the postcard gallery.
They should preserve the gallery's restrained character rather than make it
feel like a feature-rich media product.

## Visual character

**Status:** Seed

- Keep the gallery simple, sharp, and minimal: mono fonts; no ornamental detail
  or softness.
- Present postcards as a grid. Explore max/min-width cells or cells responsive
  to aspect ratio; on large screens, use no more than three columns, and use a
  single column on small screens.
- Explore a gallery-level colour palette and pixel treatment that visitors see.
  A separate development mode may help choose that presentation.

**Open tension:** A shared palette or pixelation/dithering shader could give
the collection coherence, but it must be reconciled with self-contained
postcards and with the possibility that a scene needs a different treatment.

## Publishing and ordering

**Status:** Seed

**Idea:** Order postcards by publication, newest first, rather than merely by
creation date. A postcard may remain in progress until it is posted, at which
point it receives a timestamp and published label or moves into a published
location.

**Why it might matter:** It distinguishes making from releasing and gives the
gallery a clear public chronology.

**Open questions:** What is the minimum publication state? Should unpublished
postcards exist in the repository but stay out of the gallery? Is moving files
useful, or is metadata sufficient?

## Viewport-aware animation

**Status:** Seed

**Idea:** Postcards animate indefinitely while they are relevant to the
viewport, but stop when they are roughly half a viewport outside its top or
bottom edge.

**Why it might matter:** Retains the feeling of living postcards without doing
unnecessary work far from view.

**Open questions:** Does the threshold feel natural during fast scrolling? How
should pausing interact with a postcard's own controls or gallery previews?

## Poems and spoken text

**Status:** Seed

**Idea:** A postcard may carry a small poem that appears on hover. Visitors may
optionally enable voice-over for these poems.

**Why it might matter:** Extends each postcard without forcing text into its
image.

**Constraints:** The poem must remain optional and accessible without hover;
voice should be explicitly enabled and should not compete with ambient sound.

## Ambient soundscape

**Status:** Seed

**Idea:** Assign each postcard one to three audio tags. The gallery calculates
tags approaching, within, and leaving the screen, then balances ambient tracks
such as wind, rain, people, or birds according to their presence and distance.
Visitors can independently enable accompanying Blinking Robot music and use a
control panel to enable layers and adjust volumes.

**Why it might matter:** Browsing can feel spatial and continuous rather than
like opening isolated silent thumbnails.

**Open questions:** Browser autoplay and consent; audio accessibility; mixing
rules; whether nearby cards should blend or take turns; performance; and how to
keep the result quiet rather than busy.

## Browsing controls

**Status:** Seed

- Offer tag filtering, such as showing only postcards tagged `cloud`.
- Explore a control panel for user-facing audio layers and volume.
- Consider visitor-selectable colour palettes. Pixel-density selection is less
  certain and should remain optional rather than assumed.

**Constraint:** Controls should not become a dashboard. The default browse-and-
watch experience remains simple.

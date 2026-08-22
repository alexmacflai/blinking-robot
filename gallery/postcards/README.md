# Postcards

## Purpose

Contains the individual coded animation postcards in the Blinking Robot gallery.

## Boundaries

- **In scope:** postcard folders, postcard-specific documentation, and runnable postcard HTML.
- **Out of scope:** gallery-wide presentation, reusable infrastructure, and product or design theory.

## Context

`[postcard]` `[scene]` `[vignette]` `[runnable]` — one small world per folder, usually with something moving inside a static scene.

## Handbook

- [`windmill/README.md`](windmill/README.md) routes work on the first postcard.
- To add a postcard, create a named folder, add its README and a `references/`
  folder with its own README, then add a directly runnable `index.html`.

## Local rules

Keep postcards self-contained until shared code is justified by multiple postcards. Each postcard's `references/` folder holds supplied sketches, illustrations, style references, storyboards, and other source material. Do not load those files from `index.html`; they are production context, not runtime assets. Do not put gallery navigation or broad product rules in a postcard folder.

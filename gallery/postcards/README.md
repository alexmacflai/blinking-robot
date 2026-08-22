# Postcards

## Purpose

Contains the individual coded animation postcards in the Blinking Robot gallery.

## Boundaries

- **In scope:** postcard folders, postcard-specific documentation, and runnable postcard HTML.
- **Out of scope:** gallery-wide presentation, reusable infrastructure, and product or design theory.

## Context

`[postcard]` `[scene]` `[vignette]` `[runnable]` — one small world per folder, usually with something moving inside a static scene.

## Handbook

- [`windmill/README.md`](windmill/README.md) routes work on the first postcard,
  including its clean `index.html` and maker-facing `controls.html` surfaces,
  which set the practical benchmark for new controls pages.
- [`coffee/README.md`](coffee/README.md) routes work on the coffee postcard: an
  espresso machine filling a cup that is already full, with its `index.html` and
  `controls.html` surfaces.
- To add a postcard, create a named folder, add its README and a `references/`
  folder with its own README, then add a directly runnable public `index.html`
  and a self-contained maker-facing `controls.html`. Follow the controls
  contract in [`AGENTS.md`](../../AGENTS.md), selecting scene-appropriate
  creative levers in addition to the required generic controls.

## Local rules

Keep postcards self-contained until shared code is justified by multiple postcards. Each postcard's `references/` folder holds supplied sketches, illustrations, style references, storyboards, and other source material. Do not load those files from `index.html`; they are production context, not runtime assets. Do not put gallery navigation or broad product rules in a postcard folder.

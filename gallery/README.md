# Gallery

## Purpose

The user-facing collection and routing layer for runnable coded animation postcards.

## Boundaries

- **In scope:** the gallery landing page, postcard discovery, and postcard entry points.
- **Out of scope:** product theory, shared rendering code, and agent instructions.

## Context

`[gallery]` `[routing]` `[postcard]` `[runnable]` `[entry-point]` — the path from the collection to an individual animation.

## Handbook

- [`index.html`](index.html) is the user-facing gallery entry point.
- [`postcards/README.md`](postcards/README.md) routes work on individual postcards.

## Local rules

Keep the gallery landing page lightweight. Every postcard belongs under `postcards/` and must have its own README, `references/` folder, and directly runnable HTML entry point. References inform production only; they are not gallery assets.

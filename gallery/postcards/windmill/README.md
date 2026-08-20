# Windmill postcard

## Purpose

The first Blinking Robot postcard: a static windmill scene with internal motion. It is a procedural, self-contained 1-bit/dithered animation with no external assets.

## Boundaries

- **In scope:** this scene, its renderer, controls, configuration, and postcard-specific behavior.
- **Out of scope:** shared runtime extraction, gallery navigation, and product-wide visual rules.

## Context

`[postcard]` `[windmill]` `[procedural-rendering]` `[1-bit]` `[dither]` `[animation-controls]` — one still world with wind, depth, particles, and a turning mill.

## Handbook

Open [`index.html`](index.html) directly. Space pauses, H toggles the readout, and the panel exposes scene and output controls.

## Local rules

Keep the postcard self-contained and asset-free. Preserve the existing controls and export/config behavior unless the change explicitly concerns this postcard.


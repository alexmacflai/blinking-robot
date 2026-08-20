# Windmill postcard

## Purpose

The first Blinking Robot postcard: a static windmill scene with internal motion. It is a procedural, self-contained 1-bit/dithered animation with no external assets.

## Boundaries

- **In scope:** this scene, its renderer, controls, configuration, and postcard-specific behavior.
- **Out of scope:** shared runtime extraction, gallery navigation, and product-wide visual rules.

## Context

`[postcard]` `[windmill]` `[procedural-rendering]` `[1-bit]` `[dither]` `[animation-controls]` — one still world with wind, depth, torn cloud, and a turning mill.

## Handbook

Open [`index.html`](index.html) directly. Space pauses, H toggles the readout, and the panel exposes scene and output controls.

The cloud layer the sails pass through is a field with a carve mask, not a
particle system; only cloud the blades actually tear off becomes particles.
[`knowledge/decisions/0001-cloud-deck-as-field.md`](../../../knowledge/decisions/0001-cloud-deck-as-field.md)
records why, and which parts of it are load-bearing.

## Brief

- What is happening? A windmill turns through a torn, wind-driven cloud deck.
- Single visual idea: its sails visibly tear material from the cloud layer they
  pass through.
- What matters most? The cloud, depth, wind, and rotation must read as one
  relationship.
- What can be ignored or collapsed? Surface detail outside that interaction.
- What relationship or motion must read? The windmill's rotation affects the
  cloud rather than merely playing in front of it.

## Local rules

Keep the postcard self-contained and asset-free. Preserve the existing controls and export/config behavior unless the change explicitly concerns this postcard.

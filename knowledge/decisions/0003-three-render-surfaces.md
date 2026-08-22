# 0003 — Postcards have public, controls, and gallery render surfaces

`[decision]` `[decision-record]` `[postcard]` `[gallery]` `[animation-controls]`

**Status:** accepted · applies to [`gallery/`](../../gallery/)

## Context

Windmill originally combined the gallery-facing animation and its full maker
control panel in one page. That made a visitor enter the development surface,
and left the gallery able only to link to a postcard rather than show it.

## Decision

Each postcard now has three render surfaces:

- its self-contained public `index.html`, containing the animation only;
- its self-contained `controls.html`, containing that scene plus maker controls;
- the gallery `index.html`, which renders public postcards as live previews.

The renderer and default configuration are intentionally inlined in the public
and controls pages. Controls remain session-only: their existing copy-config
workflow is the bridge back to source. Gallery previews pause outside the
nearby viewport through a small message contract.

## Why

Directly opening a postcard from the filesystem is a project constraint. A
shared JavaScript module would make the renderer tidier, but would turn a
simple HTML file into a multi-file runtime dependency in common browser setups.
The small, deliberate duplication keeps both surfaces independently runnable
while making the public work free of authoring machinery.

## Costs and consequences

- Changes to the renderer or defaults must be kept aligned in both Windmill
  surfaces until shared runtime code is justified by a second postcard.
- Configuration files, persistence, global gallery palette treatment, and
  pixel treatment remain undecided. This decision does not establish them.
- The gallery owns only preview framing and lifecycle; a postcard continues to
  own its own rendering decisions.

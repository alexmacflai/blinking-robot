# Shared postcard code

Reusable browser code used by two or more postcard authoring surfaces.

## Context

`[gallery]` `[controls]` `[shared]`

## What is here

- [controls.js](controls.js) — component-first authoring-panel builder,
  canonical sidebar shell, shared controls, update contract, action bar,
  copying, and values downloads.

## Local rules

Keep scene-specific rendering and control declarations in each postcard folder.
The shared builder owns the sidebar shell, generic Basics section, footer, and
control behaviour; postcard modules add their scene-specific middle sections.

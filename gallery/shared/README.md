# Shared postcard code

Reusable browser code used by two or more postcard authoring surfaces.

## Context

`[gallery]` `[controls]` `[shared]`

## What is here

- [controls.js](controls.js) — component-first authoring-panel builder,
  canonical sidebar shell, shared controls, update contract, action bar,
  copying, and values downloads. Its controls tokens define the monochrome
  palette, `#C5E714` accent, spacing, borders, scrollbar, and Fira type stack.
- [fonts/](fonts/README.md) — local Fira Sans and Fira Mono files used by the
  controls, without a remote font dependency.
- [controls-theme.css](controls-theme.css) — the static controls tokens, fonts,
  and loading state. Every controls page links this in its `<head>` so the
  loading view is styled before its authoring module starts.

## Local rules

Keep scene-specific rendering and control declarations in each postcard folder.
The shared builder owns the sidebar shell, generic Basics section, footer, and
control behaviour; postcard modules add their scene-specific middle sections.

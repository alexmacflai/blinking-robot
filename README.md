# Blinking Robot

A small gallery of coded animation postcards. It grows from the real
*Blinking Robot* series: pixelated, dithered pieces that combine drawing,
animation, writing, voice, music, and editing into dry, introspective,
humorous, mundane, absurd, or contemplative vignettes.

This version reimagines that world as small, self-contained, procedurally
generated animations — no video, no image assets, just code drawing a still
scene with something quietly moving inside it.

`[readme]` `[gallery]` `[entry-point]`

## Watch

Open [`gallery/index.html`](gallery/index.html) to browse the postcards, or
go straight to one:

- [Windmill](gallery/postcards/windmill/index.html) — `[windmill] [cloud] [sky]
  [bird] [wind] [particles] [sim]`
- [Coffee](gallery/postcards/coffee/index.html) — `[coffee] [liquid] [sim]
  [particles]`
- [Passing legs](gallery/postcards/passing-legs/index.html) — `[passing-legs]
  [people] [walking] [leg]`

Each postcard folder also has a maker-facing `controls.html`; its README routes
to both surfaces and its supplied source material.

Authoring postcards use a small local server. From the repository root, run
`python3 gallery/export-server.py`, then open
`http://localhost:8000/gallery/index.html`. This also enables MP4 video export;
it requires the locally installed `ffmpeg` command (`brew install ffmpeg`). For preview-only work,
`python3 -m http.server` still works. Older postcards can still be opened
directly; migrated postcards use nearby scene and values files.

## Repository

- [`gallery/`](gallery/) — the postcards themselves, and the page that lists
  them.
- [`knowledge/`](knowledge/) — durable project knowledge as it accumulates:
  visual direction, conventions, decisions, and the tag vocabulary used across
  the docs.

## Working on this

If you're an AI agent, start at [`AGENTS.md`](AGENTS.md) instead of here —
it has the working conventions, the map, and the rules. This file is the
human-facing front door.

# Agent entry point

Everything an agent needs for repository-wide work is on this page. Read this,
then the durable knowledge relevant to the change, then the README of the
directory you are changing. Follow direct links from this page or the nearest
README; do not chain through intermediate READMEs to get there.

`[agent]` `[conventions]` `[index]`

## What this repository is

Blinking Robot is a small gallery of coded animation postcards: pixelated,
dithered scenes that are mostly still with something moving inside them. The
near-term product is browse-and-watch. Do not assume accounts, data, complex
interaction, or a framework.

Human-facing context lives in [`README.md`](README.md). It is not part of the
default agent read path, but update it whenever a change makes its public
overview, entry points, or usage instructions incomplete or inaccurate.

## Map

```
gallery/     runnable postcards and the landing page
knowledge/   durable project knowledge: design, engineering, decisions, vocabulary
```

## Where things go

| Content | Location | Status |
| --- | --- | --- |
| A public postcard surface | `gallery/postcards/<name>/index.html` | live |
| A postcard controls surface | `gallery/postcards/<name>/controls.html` | required |
| Postcard source references | `gallery/postcards/<name>/references/` | live |
| Gallery landing page | `gallery/index.html` | live |
| Tag vocabulary | `knowledge/vocabulary.md` | live |
| Technical conventions, invariants, contracts | `knowledge/engineering/` | create on first use |
| Decision records | `knowledge/decisions/` | create on first use |
| Product premise, lexicon, high-level directions | `knowledge/product/` | live |
| Visual principles, moods, composition | `knowledge/design/` | live |
| Requirements and acceptance criteria | `knowledge/specs/` | create on first use |
| Reusable agent skills | `workflows/skills/` | create on first use |
| Prompts orchestrating several skills | `workflows/prompts/` | create on first use |
| Code shared by two or more postcards | `gallery/shared/` | create when a second postcard needs it |

"Create on first use" means the directory and its README are created together
with the first real file that belongs there. Do not create the directory ahead
of the content — an empty directory holding only a README describing what
would go in it is overhead with no payoff until something actually needs it.

## Working rules

1. Every directory **with content** has exactly one canonical `README.md`. No
   competing index files.
2. Postcard surfaces are self-contained and asset-free at runtime: each public
   `index.html` and required maker-facing `controls.html` is directly runnable,
   with no build step, no dependencies, and no runtime-loaded source material.
   Supplied material belongs in that postcard's `references/` folder and must
   never become a runtime dependency.
3. Every postcard is portrait 9:16, authored on a 9k x 16k pixel grid. This is
   the project's fixed frame — postcards are made to be watched the way a phone
   is held — and it is not a per-scene decision. A brief that seems to want a
   wider composition solves it inside the portrait frame, by cropping and by
   what it leaves out, rather than by changing the frame.
4. Do not extract shared postcard runtime code merely because a public and
   controls surface duplicate it. Extract only when a second postcard actually
   needs the same implementation; then it goes in `gallery/shared/`.
5. Repo-wide rules live on this page only. Link to it instead of restating it —
   duplicated guidance is what drifts out of sync with the tree.
6. Make small, reversible changes. State assumptions when the project is silent
   rather than inventing policy.
7. Tag documents using [`knowledge/vocabulary.md`](knowledge/vocabulary.md).
   Do not invent a tag without adding it there.
8. Update the nearest README when you add a concept or an entry point. A
   postcard's `references/` folder has its own README documenting its supplied
   source material.
9. Before changing a postcard, consult the relevant durable knowledge in
   [`knowledge/`](knowledge/)—especially [`knowledge/design/`](knowledge/design/)
   for visual direction, motion, or rendering. Use it as project-level guidance;
   the nearest README supplies local context and rules.
10. Update the root [`README.md`](README.md) when a change affects the
   human-facing description of the project, its public entry points, or how a
   visitor runs or browses it. Do not change it for internal-only maintenance.
11. Before creating or materially revising a postcard, search existing
    postcards and [`knowledge/design/visual-language.md`](knowledge/design/visual-language.md)
    for overlapping tags, objects, materials, or behaviours. Reuse an
    established visual or motion pattern only when it supports the new brief;
    do not copy it across incompatible perspective, composition, or mood.
    When a postcard establishes a transferable pattern, record its effect,
    conditions, and limits in the visual-language catalogue. Keep implementation
    self-contained until a second postcard truly needs shared code.
12. Every new postcard must include a maker-facing `controls.html`, alongside
    its clean public `index.html`. It must render the same postcard and expose
    live controls that let the human author meaningfully tune the scene without
    editing code. Start from the Windmill controls page as the interaction
    benchmark, adapting its UI and controls to the scene rather than copying its
    implementation blindly.
13. Each controls page must include these generic controls: pixel settings
    (authoring grid/resolution and display fit where relevant), a monochrome
    color palette (at least darkest and brightest tones), **Save PNG**, and
    **Save values** (a copyable and/or downloadable complete configuration that
    can be restored or pasted back into source). Its scene controls must expose
    the parameters a human is most likely to need: motion speed and duration,
    element position (x/y/z or the scene's meaningful equivalent), tonal
    shades, and any brief-specific or requested behaviour. Exercise judgement:
    expose useful creative levers and dependent values, not every internal
    implementation constant. A human may request additional controls later.

## README shapes

Two forms. Use the lighter one unless the directory routes to children.

**Area README** — for a directory whose job is routing (`gallery/`,
`knowledge/`). Sections: Purpose, Boundaries, Context, Handbook, Local rules.

**Leaf README** — for a directory that holds files rather than routing to
subtrees (a postcard, once created; `knowledge/engineering/`, once created).
Sections: a one-or-two-line purpose, Context tags, what is in here or how to
run it, and Local rules only when a rule is genuinely non-obvious. Do not pad
a leaf to the area shape.

## Verifying a change

Postcard surfaces open directly from the filesystem — no server required. After
changing one, open its public `index.html`, confirm the animation runs, and open
`controls.html` to exercise its controls, including PNG and values export.
There are no automated tests.

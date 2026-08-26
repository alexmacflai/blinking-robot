# Agent entry point

Everything an agent needs for repository-wide work is on this page. Read this,
then the durable knowledge relevant to the change, then the README of the
directory you are changing. Follow direct links from this page or the nearest
README; do not chain through intermediate READMEs to get there.

## Repository-local skills

Before handling a request, inspect `workflows/skills/README.md` and search
`workflows/skills/` for a matching `SKILL.md`. If one matches the request, read
it completely and follow it. Repository-local skills are mandatory workflows,
not optional reference material.

For requests involving a new postcard idea, GitHub ticket, or issue draft, use
`workflows/skills/postcard-idea-to-ticket/SKILL.md`.

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
| Postcard scene brief | `gallery/postcards/<name>/brief.md` | live |
| Gallery landing page | `gallery/index.html` | live |
| Tag vocabulary | `knowledge/vocabulary.md` | live |
| Technical conventions, invariants, contracts | `knowledge/engineering/` | create on first use |
| Decision records | `knowledge/decisions/` | create on first use |
| Product premise, lexicon, high-level directions | `knowledge/product/` | live |
| Visual principles, moods, composition | `knowledge/design/` | live |
| Requirements and acceptance criteria | `knowledge/specs/` | create on first use |
| Reusable agent skills | `workflows/skills/` | create on first use |
| Prompts orchestrating several skills | `workflows/prompts/` | create on first use |
| Code shared by two or more postcards | `gallery/shared/` | live |

"Create on first use" means the directory and its README are created together
with the first real file that belongs there. Do not create the directory ahead
of the content — an empty directory holding only a README describing what
would go in it is overhead with no payoff until something actually needs it.

## Working rules

1. Every directory **with content** has exactly one canonical `README.md`. No
   competing index files.
2. Postcards are authored as small, asset-free local modules: one scene renderer
   and one values file serve both the public `index.html` and maker-facing
   `controls.html`. They run from a local preview server, with no build step or
   third-party dependencies. Legacy self-contained postcards remain runnable
   until migrated. Supplied material belongs in `references/` and must never
   become a runtime dependency.
3. Every postcard is portrait 9:16, authored on a 9k x 16k pixel grid. This is
   the project's fixed frame — postcards are made to be watched the way a phone
   is held — and it is not a per-scene decision. A brief that seems to want a
   wider composition solves it inside the portrait frame, by cropping and by
   what it leaves out, rather than by changing the frame.
4. A postcard's renderer and values are shared by its public and controls
   surfaces. The reusable controls toolkit lives in `gallery/shared/`; keep
   scene rendering postcard-local.
5. Repo-wide rules live on this page only. Link to it instead of restating it —
   duplicated guidance is what drifts out of sync with the tree.
6. Make small, reversible changes. State assumptions when the project is silent
   rather than inventing policy.
7. Tag README files using [`knowledge/vocabulary.md`](knowledge/vocabulary.md).
   Do not invent a tag without adding it there. When changing a postcard
   README's tags, update the matching entry in `gallery/postcards/README.md` in
   the same change.
8. Update the nearest README when you add a concept or an entry point. A
   postcard's `brief.md` owns its scene-specific intent; its `references/`
   folder has its own README documenting supplied source material.
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
12. A postcard's `brief.md` must follow the
    [`postcard-brief.md`](knowledge/design/postcard-brief.md) template and name
    the specific design documents and principles it answers to — art
    direction, motion, rendering — and any visual-language pattern it reuses
    or deliberately declines. A read of `knowledge/design/` that leaves no
    trace in the brief does not satisfy rule 9.
13. Before writing a postcard's scene module, state in the brief or an
    accompanying note how the scene answers art direction, motion, and
    rendering, including which briefed or sketched elements are being dropped
    and under which principle. Resolve this before implementation, not after —
    it is where a wrong reading is cheap to correct.
14. Every new postcard must include a maker-facing `controls.html`, `brief.md`,
    scene module, and values file, alongside its clean public `index.html`. The controls surface
    must render the same postcard and expose
    live controls that let the human author meaningfully tune the scene without
    editing code. Start from the Windmill controls page as the interaction
    benchmark, adapting its UI and controls to the scene rather than copying its
    implementation blindly. Use `gallery/shared/controls.js` directly: the
    shared builder owns the shell, Postcard Basics, Gallery writing and publish
    controls, component behaviour, and action sheet; the postcard’s
    `authoring.js` declares only its scene-specific sections.
15. Each controls page must use the shared builder and include its generic
    **Postcard Basics** and **Gallery** sections: pixel settings (authoring
    grid/resolution and display fit where relevant), a monochrome color palette
    (at least darkest and brightest tones), publish state, and hover writing.
    Its shared action sheet supplies **Play/Pause**, **Reset**, **Save Frame**,
    **Save Video**, **Copy values**, and **Save values**. Save Values must be a
    complete downloadable replacement for the postcard's `values.json`. Its
    scene controls must expose
    the parameters a human is most likely to need: motion speed and duration,
    element position (x/y/z or the scene's meaningful equivalent), tonal
    shades, and any brief-specific or requested behaviour. Exercise judgement:
    expose useful creative levers and dependent values, not every internal
    implementation constant. A human may request additional controls later.

## README shapes

Two forms. Use the lighter one unless the directory routes to children.

**Area README** — for a directory whose job is routing (`gallery/`,
`knowledge/`). Sections: Purpose, Boundaries, Context, Handbook, Local rules.
The Handbook is a compact, tagged index: it names the destinations and links to
them so readers can choose where to go without opening every file. It does not
repeat the contents, rationale, or implementation of an entry.

**Leaf README** — for a directory that holds files rather than routing to
subtrees (a postcard, once created; `knowledge/engineering/`, once created).
Sections: a one-or-two-line purpose, Context tags, what is in here or how to
run it, and Local rules only when a rule is genuinely non-obvious. A leaf
README orients; it does not narrate the artifact, reproduce its brief, or
explain its implementation. Do not pad a leaf to the area shape.

**References README** — the small factual inventory for a postcard's
`references/` folder. List the files actually present, their provenance when
known, and a short note on how each informs the work. Do not record absent
material, conversation history, design rationale, or implementation details.
Link to the repository rule that references are production context, never
runtime assets.

## Verifying a change

Start the local authoring server from the repository root with
`python3 gallery/export-server.py`, then open the relevant public `index.html`
URL and confirm the animation runs. Open `controls.html` to exercise its
controls, including PNG, MP4, and values export. `python3 -m http.server`
remains suitable for preview-only work.
There are no automated tests.

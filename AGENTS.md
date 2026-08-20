# Agent entry point

Everything an agent needs for repository-wide work is on this page. Read this,
then the README of the directory you are changing. Do not chain through
intermediate READMEs to get there.

`[agent]` `[conventions]` `[index]`

## What this repository is

Blinking Robot is a small gallery of coded animation postcards: pixelated,
dithered scenes that are mostly still with something moving inside them. The
near-term product is browse-and-watch. Do not assume accounts, data, complex
interaction, or a framework.

Human-facing context lives in [`README.md`](README.md). It is not part of the
agent read path.

## Map

```
gallery/     runnable postcards and the landing page
knowledge/   durable project knowledge: engineering, decisions, vocabulary
```

## Where things go

| Content | Location | Status |
| --- | --- | --- |
| A runnable postcard | `gallery/postcards/<name>/index.html` | live |
| Gallery landing page | `gallery/index.html` | live |
| Tag vocabulary | `knowledge/vocabulary.md` | live |
| Technical conventions, invariants, contracts | `knowledge/engineering/` | create on first use |
| Decision records | `knowledge/decisions/` | create on first use |
| Product premise, lexicon | `knowledge/product/` | create on first use |
| Visual principles, moods, composition | `knowledge/design/` | create on first use |
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
2. Postcards are self-contained and asset-free: one directly runnable
   `index.html`, no build step, no dependencies, no external files.
3. Do not extract shared code until a second postcard actually needs it. When
   it does, it goes in `gallery/shared/`.
4. Repo-wide rules live on this page only. Link to it instead of restating it —
   duplicated guidance is what drifts out of sync with the tree.
5. Make small, reversible changes. State assumptions when the project is silent
   rather than inventing policy.
6. Tag documents using [`knowledge/vocabulary.md`](knowledge/vocabulary.md).
   Do not invent a tag without adding it there.
7. Update the nearest README when you add a concept or an entry point.

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

Postcards open directly from the filesystem — no server required. After
changing one, open its `index.html`, confirm the animation runs, and exercise
its controls. There are no automated tests.

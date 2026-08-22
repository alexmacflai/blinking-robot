# Postcard editor ideas

`[product]` `[idea]` `[workflow]`

Uncommitted directions for an authoring surface distinct from the postcard that
visitors see in the gallery.

## Poem authoring

**Status:** Seed

**Idea:** Place a text editor on the left for composing a postcard's poem. It
may support bold, regular, italics, spaces, line breaks, paragraphs, and
possibly alignment.

**Open questions:** What is the smallest text format that preserves the desired
expression? How does it export to the gallery's hover and optional voice flows?

## Editable configuration

**Status:** Seed

**Idea:** Store exposed property definitions and values in a file separate from
the postcard source. The postcard reads it; the editor can modify controls and
export the values file, allowing the maker to overwrite the source values
without replacing the postcard code.

**Open tension:** This is a strong authoring capability, but it changes the
current self-contained, directly runnable postcard-surface constraint. It requires an
explicit architectural decision before implementation.

## Visual object editing

**Status:** Seed

**Idea:** Eventually allow manual adjustment of an object's shape in a visual
editor.

**Open questions:** Which objects are editable, how their edited geometry is
stored, and whether this remains compatible with procedural rendering.

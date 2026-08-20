# Postcard editor ideas

`[product]` `[idea]` `[workflow]`

Uncommitted directions for an authoring surface distinct from the postcard that
visitors see in the gallery.

## Separate editor and postcard

**Status:** Seed

**Idea:** Distinguish a postcard—the gallery-facing work—from a postcard editor
used while creating it. The editor may become a reusable component, but that
is an implementation decision for later.

**Why it might matter:** It gives the maker a focused workspace without adding
creation controls to the public postcard.

## Poem authoring

**Status:** Seed

**Idea:** Place a text editor on the left for composing a postcard's poem. It
may support bold, regular, italics, spaces, line breaks, paragraphs, and
possibly alignment.

**Open questions:** What is the smallest text format that preserves the desired
expression? How does it export to the gallery's hover and optional voice flows?

## Exposed scene properties

**Status:** Seed

**Idea:** The editor always shows configurable scene properties: positioning,
customisation, animation, and related controls. A postcard exposes variables;
those variables can be grouped and carry explanations, and the editor renders
the groups as understandable controls.

**Why it might matter:** A maker can tune a postcard directly instead of asking
an AI to alter code for every adjustment.

**Open questions:** Which property types are supported first? How are unsafe or
structural values kept out of the editor? How does a scene describe a control
without coupling itself to a particular editor UI?

## Editable configuration

**Status:** Seed

**Idea:** Store exposed property definitions and values in a file separate from
the postcard source. The postcard reads it; the editor can modify controls and
export the values file, allowing the maker to overwrite the source values
without replacing the postcard code.

**Open tension:** This is a strong authoring capability, but it changes the
current one-file, directly runnable postcard constraint. It requires an
explicit architectural decision before implementation.

## Visual object editing

**Status:** Seed

**Idea:** Eventually allow manual adjustment of an object's shape in a visual
editor.

**Open questions:** Which objects are editable, how their edited geometry is
stored, and whether this remains compatible with procedural rendering.

# Decisions

## Purpose

Durable records of choices that shaped the project, and the reasoning behind
them, so a later reader can tell what was deliberate from what was accident.

## Boundaries

- **In scope:** a choice with consequences that outlive the change that made
  it — an architecture, a contract, a tradeoff taken knowingly.
- **Out of scope:** routine implementation, tuning values, and anything the
  code already states plainly. A decision record is for the *why*, not the
  *what*.

## Context

`[knowledge]` `[decision]` `[readme]` `[index]` — why things are the way they
are.

## Handbook

- [`0001-cloud-deck-as-field.md`](0001-cloud-deck-as-field.md) — `[decision-record]
  [windmill]` — superseded in part by 0002
- [`0002-sail-cloud-interaction-as-emitter.md`](0002-sail-cloud-interaction-as-emitter.md)
  — `[decision-record] [windmill]`
- [`0003-three-render-surfaces.md`](0003-three-render-surfaces.md) —
  `[decision-record] [rendering]`

## Local rules

One file per decision, numbered in order (`NNNN-short-slug.md`). Record what
was chosen, what it was chosen over, and what it costs. Add the entry to the
Handbook above in the same change. Do not rewrite a record once it lands — if
a decision is reversed, write a new record that supersedes it and say so in
both.

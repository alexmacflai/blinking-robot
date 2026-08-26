# Tag vocabulary

`[vocabulary]` `[tags]` `[documentation]`

The controlled list of `[tag]` markers used for routing. Tags exist so an agent
can identify the right instructions to open, or find postcard elements and
behaviours that can be reused. They do not restate the project's baseline
visual medium or format.

## How to use this file

- Use tags in README `## Context` lines and handbook entries. Do not tag briefs
  or reference inventories.
- Add a tag here in the same change that introduces it. Prefer an existing tag
  before adding a close synonym.
- Prefer a tag already used nearby over inventing a close synonym (`decision`
  not `rationale`; `spec` not `specification`).
- A postcard's name may appear in its README and routing entries; it does not
  need a vocabulary entry. When its tags change, update the matching
  `gallery/postcards/README.md` entry in the same change.
- Never use `[1-bit]`, `[pixelated]`, `[postcard]`, or `[dither]`: those
  describe the project baseline, not a useful route or reusable element.
- Retire a tag here only when no document uses it anymore.

## Subject — what the content is about

`[gallery]` `[knowledge]` `[mission]` `[product]` `[design]`
`[engineering]` `[decision]` `[spec]` `[vocabulary]`

## Kind — what shape the document is

`[readme]` `[index]` `[entry-point]` `[decision-record]` `[skill]` `[prompt]`
`[idea]`

## Domain — technical or visual territory

`[coded-animation]` `[procedural-rendering]` `[reference]` `[static-site]`
`[browser]` `[performance]` `[scene]` `[vignette]` `[depth]`
`[animation-controls]` `[art-direction]` `[motion]` `[rendering]`
`[authoring]` `[video-export]`

## Postcard elements and behaviours

`[bird]` `[car]` `[cloud]` `[hill]` `[house]` `[leg]` `[liquid]` `[particles]`
`[people]` `[road]` `[sign]` `[sim]` `[sky]` `[spiral]` `[walking]` `[wind]`

## Process — how work gets done here

`[agent]` `[conventions]` `[verification]` `[workflow]` `[repeatability]`
`[routing]` `[runnable]` `[brief]`

## Retired

None yet. When a tag is retired, list it here with the date and what replaced
it, so an old reference is explainable rather than mysterious.

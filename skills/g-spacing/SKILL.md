---
name: g-spacing
description: "What looks nice means for layout in g-design: the spacing, alignment and fit faults Gabriel keeps catching by eye, as a checklist to build against and to judge screenshots with. Use when building or reviewing any page or UI on a g project, and as the guidance half of the correct.ui.spacing gate. Not for colour, copy or motion, which the g-design skill covers."
---

# g-spacing

These are the layout faults Gabriel spots at a glance and keeps having to point
out. Every item below comes from one of his corrections, quoted in brackets.
g-design sets the numbers: the 4px grid, the spacing scale (4, 8, 12, 16, 24,
32, 48, 64), the height scale `--h-*` and the gutter (16, 24, 32). This is how a
page that uses those numbers still goes wrong.

## The checklist

**Nothing touches by accident**

1. Text never touches the edge of its box. A card keeps `--sp-4` between its edge
   and its text, a badge, pill, button or cell at least `--sp-2` either side.
   ("cards touching text", "the bb and sb badges stuck in the top left with no padding")
2. Nothing touches text it is not part of. An image, mascot, icon or chart sits at
   least `--sp-2` from neighbouring text. ("the george is touching this text,
   there needs to be a little more buffer")
3. An icon button keeps room either side of its icon and takes its height from
   `--h-*`. ("the edit and settings buttons are super squished and need a little
   padding either side of the icon")
4. Nothing overlaps unless it is a layer on purpose. No text on text, no box on
   text, and the first frame of an animation counts. ("the infographic has
   overlapping text", "stuff overlaps at start")

**Everything stays in its box and on the screen**

5. A chart, image or table never pokes out of the card it sits in. ("the charts
   leave the box and poke through the roof", "some of the graphs still get clipped")
6. Nothing is cut off. Truncate on purpose, with an ellipsis and a way to read the
   rest. ("have a read more button if it overflows")
7. The page fits a 390px phone and a landscape phone, with no sideways scroll and
   no control off the edge. ("it doesn't fit on the page", "make sure the race
   lobby all fits on the landscape phone, 80% of it does")

**Even and aligned**

8. Insets match on both sides unless the design says otherwise. ("it's miles from
   the right and touching on the left")
9. Gaps between siblings of the same kind are equal and on the scale. A bigger gap
   separates groups, a smaller one joins them. ("spacings are off with buttons and
   stuff, we need correct gaps")
10. Things that look aligned are aligned exactly. Three pixels off reads worse than
    clearly offset. ("everything needs to line up a little more", "put them on a grid")
11. A shared element sits in the same place on every sibling screen: titles, menus,
    nav, toolbars, and the columns of tables that share them. (a title 350px off
    from its siblings)
12. Same-kind siblings are the same size: icons, badges and buttons in a row. ("why
    is it green and slightly bigger than the one next to it")

**Scale and weight**

13. No big empty bands and no largely blank screens. ("less of a massive gap in the
    middle", "LOTs of space above", "avoid largely blank screens")
14. Size things to their job. Secondary actions stay quiet, no giant pills or giant
    icons, and a mark matches the text beside it. ("these buttons need to be more
    subtle, right now they are giant pills", "giant google icons", "top of the logo
    to the bottom should be same size as the text")
15. Every section has a title, sized for its level, and sibling sections get the
    same treatment. ("the title is tiny and there's no title for the bots section")
16. Nothing already on screen moves while the page loads. Give each slot its size
    before its data arrives (g-design's reserved slot).
17. Less is more. Fewer elements with more space, and a wall of text becomes a
    table, a chart or a list. ("we should be able to see the info not read it")

## Checking a page

Mechanical half, from any directory:

    python3 /home/gabriel/g-levels/glevels/spacing.py <url | file.html | pages/<slug>/content.html> [more sibling screens]

It renders every target at 1280x800 and 390x844 in one Chromium, exits 1 on clear
faults (items 1 to 7, 11 and 16 when they are unambiguous) and lists leads for a
reviewer (grid, gaps, alignment, sizes, bands, tap targets). A g-site page file is
compiled fresh and served over the running g-site, so it checks the edit, not the
deploy. Pass sibling screens together and their landmarks are compared. Grid
numbers come from g-design's `rhythm-audit.mjs`, through the shared
`packages/g-ui/scripts/rhythm-measure.mjs`.

Review half: someone who did not build the page opens the screenshots the sensor
prints, at both widths, and goes down the checklist. The rubric is in the gate,
`gates/correct.ui.spacing.toml` in g-levels, and `glevels brief --review` hands it
over. Name each fault by screenshot, place and checklist number.

Clear faults are fixed before review. Leads are judged, not obeyed: an overlap on a
map, a stamp or a progress fill can be the design. Never quiet a finding with
`data-audit-skip` unless the element really is decoration.

## Why it has two halves

Geometry is the script's job. Vision models place things badly: on UICrit's
screens a screenshot-only prompt put critiques in the right region with a mean IoU
of 0.004. Judgement is the reviewer's job, because a script cannot tell an intended
layer from an accident, or a grouping gap from an uneven one. So only unambiguous
geometry blocks, and everything else is a lead for the eye.

## References

- Gestalt proximity, related things closer than unrelated ones: Harley, NN/g,
  2020, https://www.nngroup.com/articles/gestalt-proximity/
- Spacing on a base unit: Material's 8dp grid with type on 4dp,
  https://m1.material.io/layout/metrics-keylines.html, and Atlassian's spacing
  scale, https://atlassian.design/foundations/spacing
- Vertical rhythm, line height as the unit of vertical space: Rutter, 2006,
  https://24ways.org/2006/compose-to-a-vertical-rhythm/
- Layout failure classes (collision, protrusion, viewport protrusion, wrapping):
  ReDeCheck, Walsh, Kapfhammer and McMinn, ISSTA 2017,
  https://github.com/redecheck/redecheck, and Viser on which DOM findings a person
  can actually see, Althomali et al. 2019,
  https://www.gregorykapfhammer.com/research/papers/althomali2019/
- Layout specs and visual regression: Galen's near and aligned checks,
  https://www.galenframework.com/docs/reference-galen-spec-language-guide/,
  BackstopJS and Playwright's toHaveScreenshot for comparing over time
- Reflow at 320 CSS px, target size 24 by 24: WCAG 2.2 SC 1.4.10 and 2.5.8,
  https://www.w3.org/WAI/WCAG22/Understanding/reflow.html,
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Layout shift over 0.25 is poor: web.dev's Cumulative Layout Shift,
  https://web.dev/articles/cls
- Models as UI critics, and their weak localisation: UICrit, Duan et al.,
  UIST 2024, https://arxiv.org/abs/2407.08850, and LLM feedback on mockups,
  Duan et al., CHI 2024, https://arxiv.org/abs/2403.13139
- Almost aligned looks worse than clearly offset:
  https://www.data-meets-design.com/docs/generaldesign/alignment/

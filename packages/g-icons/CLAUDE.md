# g-icons

**What:** The animated icon set. One hand-editable SVG per icon in `icons/`,
inlined into `dist/g-icons.js` by `scripts/build-icons.mjs` (run via the
root `scripts/build.mjs`). These exist for icons that MOVE; static glyphs
stay plain inline Phosphor fills.

## Source format (also the hand-drawing guide)

- viewBox `0 0 256 256`, stroke geometry only: paths get no fill/stroke
  attributes; the CSS base (`.gi` in g-ui.css) applies
  `fill: none; stroke: currentColor; stroke-width: 16; round caps/joins`.
  16 units on the 256 grid matches Phosphor Regular's visual weight.
- Every piece that animates independently is a `<g data-part="name">`.
  Part names are the animation API: g-ui.css targets
  `[data-saved] .gi-save [data-part="label"]` and so on.
- A path that should DRAW carries `pathLength="1"` so CSS can run
  `stroke-dasharray: 1; stroke-dashoffset: 1 -> 0` without measuring.
- Parts that need clipping (the download arrow entering its tray) sit
  inside a wrapper group, e.g. `data-part="arrow-clip"`; the clip itself is
  CSS (`clip-path: inset(...) view-box`) so inlining the icon twice never
  collides on ids. No `<clipPath>` elements with ids in sources.
- Keep drawings inside roughly 36..220 so strokes never clip at the edge.

## Gotchas

- `dist/g-icons.js` is generated; the root build concatenates it ahead of
  g-ui.js into the docs asset, so `g.icon()` exists before injection runs.
- Animation state CSS lives in `packages/g-ui/src/g-ui.css`, not here.
  Sources stay pure geometry.

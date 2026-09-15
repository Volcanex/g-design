# g-admin (client)

The admin-only overlay: a bar, an annotate mode, a devtools-like edit mode and
an x-ray lens over either of them, for any g project. **Nothing here writes to source.** Every saved annotation or
edit becomes a ticket; an agent bakes tickets into source afterwards, guided by
the note. The binding contract (endpoints, ticket schema, baking) is
`agents/g-admin-contract.md` at the repo root until the server half lands and it
graduates into this file.

## Where the pieces are

- `packages/g-ui/src/components/admin-stub.js` is the **only** part in the
  public bundle. It is concatenated into `g-ui.js` like any other fragment and
  costs about 0.6KB gzipped. It does nothing unless `localStorage["g-admin"]`
  is set (`?gadmin=1` sets it), and even then it only injects the overlay if
  `{base}/verify` answers 200.
- `packages/g-ui/src/admin/g-admin.js|css` build to `dist/g-admin.js|css`,
  **separate files, never concatenated into g-ui.js or g.css**. `vendor.mjs`
  copies them beside `g-ui.js`, which is how the stub finds them: it resolves
  `g-admin.js` against its own `document.currentScript.src`.
- `apps/docs/components/admin.card.html` runs the whole flow against a mocked
  `{base}` in front of `fetch`.

`{base}` is `/api/gadmin` unless `<meta name="g-admin-base">` says otherwise.
`<meta name="g-admin-project">` names the project in the bar; without it the
bar shows the hostname.

## Why it looks like this

- **One shadow root.** Host styles cannot reach in and overlay styles cannot
  reach out. `:host { all: initial }` closes the one door a shadow root leaves
  open, inherited properties, which is how a host page with `text-transform` on
  body would otherwise redraw every label in here.
- **g-admin.css carries the whole design system, re-scoped.** The build runs
  `tokens.css` through a selector rewrite (`:root` to `:host`,
  `[data-theme="x"]` to `:host([data-theme="x"])`) and then appends g-ui.css and
  the component fragments. Two things follow: the overlay uses the shipped
  components exactly as they ship rather than restating buttons and inputs, and
  it renders correctly on a page that never loaded g.css. Generating the token
  layer rather than hand-copying greys is what stops the overlay drifting off
  the scale when the scale moves. The file is large, which is the right trade
  for a file only an admin ever downloads.
- **@font-face cannot live in a shadow root.** `--font-ui` is declared on
  `:host` and resolves to whatever the host page loaded, falling through to the
  system stack when it loaded nothing.
- **Theme is mirrored, not guessed.** A MutationObserver copies `data-theme`
  and `data-density` from `documentElement` onto the host element, because the
  token blocks are scoped to `:host`.

## X-ray and layer walking

Selection answers "what is this one". These two answer "what is all of it" and
"what is around it", which is what first live use on poker said was missing:
finding a problem one click at a time is too slow.

- **X-ray is a lens, not a fourth mode.** It is a switch in the bar, on
  alongside annotate or edit, and it survives a change between them. Switched
  on from rest it enters edit mode, because "off" is the overlay gone and
  there is no stage to paint on; edit is also where a box found by looking
  becomes a box you can change.
- **One canvas, one pass.** `.ga-xray` is a full-viewport canvas under the
  drawing and the box layer. Every visible box is drawn into it in a single
  walk: margin and padding as four-strip rings in the same two tints the
  hover shading uses, an outline whose alpha and weight fade with nesting
  depth, and a warning line on any edge off the 4px grid. Per-element DOM
  decorations would put hundreds of nodes into the host page's layout, and
  the overlay's whole promise is that it changes no layout.
- **Repaint is rAF-throttled** and driven by scroll, resize, the theme
  observer and a MutationObserver on the body. The observer is connected only
  while the lens is on, and mutations inside the overlay's own host element
  are ignored, which is the whole test for "ours" because everything of ours
  is in there.
- **The walk is capped** at `XRAY_MAX` boxes and only paints what intersects
  the viewport, but it descends through elements that do not: a section
  scrolled halfway off screen still holds children on it.
- **Layer walking is an edit-mode feature**, because the selection and the
  inspector are. `[` and `]` walk the ancestry, and alt with the arrows does
  the same; the arrows alone keep nudging the selected element by its margin.
  Alt-click, or a second click within a few pixels of the last one, takes the
  next element down `document.elementsFromPoint()`, which is the only way to
  reach an element that another element covers. Esc unwinds the walk one step
  at a time before it deselects, so the way out is the way you came in.
- The breadcrumb in the inspector head is the ancestry, oldest first, scrolled
  to the end. Clicking a crumb selects it and drops the walk trail, the same
  as a fresh click on the page.

## Gotchas

- **The box layer belongs to one mode at a time.** Locking the scrollbar away
  when annotate mode opens fires a `resize`, so anything that redraws the box
  layer on resize has to check the mode first, or it wipes the pins in the
  frame after they are drawn.
- **Annotate mode locks scrolling.** Every rect and the drawing are in viewport
  coordinates; a scroll would leave them pointing at the wrong thing. Position
  the page first, then annotate. Edit mode does not lock, and redraws its boxes
  on scroll instead.
- **Leaving a mode reverts pending edits.** They are unsaved DOM mutations, and
  leaving them behind makes the page lie about itself. Saving reverts them too:
  the ticket is the record, and `{base}/overrides.css` is the layer for a
  project that wants unbaked edits to survive a reload.
- **"Off" is not a fourth mode, it is leaving**: the overlay is removed and the
  browser disarmed. The off radio also listens for `click`, because it is the
  resting state and `change` never fires for a radio that is already checked.
- **Painted pixels do not restyle themselves.** Every other part of the
  overlay follows a theme change because its colours are tokens on `:host`.
  The x-ray sheet is pixels, and a canvas cannot resolve a custom property, so
  the colours are read off the host at paint time and the sheet has to be
  repainted when the theme moves. The MutationObserver that mirrors the theme
  is the only one watching `documentElement`, so that repaint hangs off it;
  the body observer never sees the attribute.
- **Off the grid is measured from the container, not from the page.** Same
  rule as `packages/g-ui/scripts/rhythm-audit.mjs`, and deliberately the same
  *number*: the page-origin measure inherits every border above a box, so on
  a bordered design it flags most of the screen and says nothing. It also
  skips what the layout placed rather than the author: absolutely positioned
  boxes, inline boxes, and anything centred or end-aligned in a flex or grid
  parent.
- **The inspector covers the right 320px of the viewport**, and the stage
  underneath it never sees the click. An element under there is reachable by
  walking to it, not by aiming at it, which is why the docs card puts the
  overlapped stack in the left column. The legend moves out from under the
  inspector with a sibling rule, which is why it is appended last.
- **Zero is on the grid.** The spacing scale lookup returns the stop, not the
  token name, so a value of 0 reads as on-scale and unnamed rather than off the
  scale. Anything that is genuinely off the scale is flagged in place, never
  corrected.
- The spacing and line-height scales are read from the **host page's** `:root`
  at the moment a control renders, so a project that re-tuned its steps snaps
  to its own. A page with no `--sp-*` falls back to 4/8/12/16/24/32/48/64.
- `g.init(shadowRoot)` wires the shipped pane behaviour inside the overlay, so
  it has to run after the panes exist. That is why mounting is the last thing
  the file does.

## Budget

The public bundle is gated in `scripts/build.mjs`: `g-ui.js gzip` against a
23KB budget. If that warns, something that belongs in `g-admin.js` has leaked
into the stub.

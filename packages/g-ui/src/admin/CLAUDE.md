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
  costs about 0.9KB gzipped. It does nothing unless `localStorage["g-admin"]`
  is set (`?gadmin=1` sets it, cmd+shift+K toggles it, the bar's "off" clears
  it), and even then it only injects the overlay if `{base}/verify` answers
  200. **It is not minified by the build**, so a comment in there costs real
  bytes against the 23KB gate; the reasoning that does not have to be read at
  the keyboard belongs in this file instead.
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

## Why an edit is written twice

First live use reported that margin and padding edits "did not update". They
did: every one of them applied and persisted. What was missing was any sign of
it, on a page where a 4px step is invisible and the element being edited was
placed by a layout engine that put it back. Three answers, all in edit mode:

- **Applying flashes what changed.** The box layer is redrawn immediately
  rather than on the next scheduled frame, the strips and the outline come
  back with a flash class, and the value chip flashes too. The scheduled
  redraw is deliberately not used for this: it would repaint the flash away on
  the very next frame.
- **The margin pane says when a margin will not behave.** An inline box
  ignores vertical margin, a positioned element is placed by something that
  will place it again on its next render, and a flex or grid item is spaced by
  its container as well. Silence there is indistinguishable from a broken
  tool.
- **Every edit is written inline and mirrored into one `<style
  data-g-admin-pending>` in the head**, one rule per pending edit, `!important`
  because what it is competing with after a re-render is the framework's own
  inline style. The inline write is what shows instantly; the rule is what
  survives an app page rebuilding the node underneath it. Revert removes the
  tag with the last rule in it.
- **The selection is re-resolved by selector on every read and every write.**
  A detached node reports no computed style at all, so a stepper holding one
  shows 0 for everything and then steps from 0, which is the edit landing
  somewhere nobody asked for. A reference still in the document is trusted as
  it stands: the selector was unique when captured, and a re-render can make
  it ambiguous.

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
  project that wants unbaked edits to survive a reload. The pending stylesheet
  survives a re-render, not a reload; that distinction is the whole reason
  `overrides.css` still exists.
- **Revert puts back the page's own inline value, not nothing.** Writing a
  longhand expands any shorthand the page declared inline, so an element the
  page styled `padding: 13px` and we edited on its top side would revert to a
  top padding of zero if revert only removed the longhand. What the style
  attribute said about that one property is captured at first touch, read
  through CSSOM so a shorthand is already expanded, and written back.
- **A stepper field takes any text, and `parseFloat` says NaN to most of it.**
  A non-finite commit is dropped rather than recorded: it would otherwise put
  `NaNpx` into the record a baking agent reads, and into the pending
  stylesheet.
- **"Off" is not a fourth mode, it is leaving**: the overlay is removed and the
  browser disarmed. The off radio also listens for `click`, because it is the
  resting state and `change` never fires for a radio that is already checked.
  Anything else that tears the overlay down, the stub's toggle hotkey included,
  must call `window.__gAdminOff()` rather than removing the element: pending
  edits live in inline styles and in a stylesheet in the head, and dropping the
  element leaves both applied with nothing on screen left to say so.
  `window.__gAdmin` is the stub's "already loaded" flag; this is its
  counterpart.
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
- **The hotkey lives in the stub, not here.** cmd+shift+K (ctrl+shift+K off a
  Mac) has to work on a page where the overlay has never loaded, so the
  listener has to be the part that always ships. Pressed cold it arms, probes
  and injects; pressed with the overlay up it calls `window.__gAdminOff()`.
  It ignores the key when focus is in a field, and it reads focus through one
  shadow root, because a document whose overlay has focus reports only the
  host element.
- **The overlay wears the host page's accent.** At boot, and again whenever
  the theme changes, the five accent tokens are read off the host page's
  `:root` and set as inline custom properties on the `<g-admin>` element. The
  token layer in g-admin.css is scoped to `:host`, where an inline property
  wins, so a project that rebranded g-system gets an overlay in its own accent
  and everything else stays g-system. A page that resolves none of them is
  left alone. The theme observer does the re-read because a rebrand is allowed
  to name a different accent per theme, and a value frozen at boot would be
  the wrong one after a theme switch.
- **Zero is on the grid.** The spacing scale lookup returns the stop, not the
  token name, so a value of 0 reads as on-scale and unnamed rather than off the
  scale. Anything that is genuinely off the scale is flagged in place, never
  corrected.
- **The inspector has to be told to scroll.** `.ga-side-body` carries
  `min-height: 0`, because a flex child's default minimum is its own content:
  without it the body grows past the sidebar instead of scrolling inside it,
  and on a short viewport the lower panes and the save button are simply
  unreachable. It also carries `overscroll-behavior: contain`, so a wheel that
  reaches the end of the pane list does not carry on into the page underneath
  and move every box the overlay has drawn.
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

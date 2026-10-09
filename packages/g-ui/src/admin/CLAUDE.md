# g-admin (client)

The admin-only overlay: a bar, an annotate mode, a devtools-like edit mode, and
an x-ray lens and a text tool over them, for any g project. **Nothing here
writes to source.** Every saved annotation or edit becomes a ticket; an agent
bakes tickets into source afterwards, guided by the note. The binding contract
(endpoints, ticket schema, baking) is `agents/g-admin-contract.md` at the repo
root until the server half lands and it graduates into this file.

The reference for what this is trying to be is VisBug. The two things it does
that VisBug does not are the whole point of it: every change lands as a ticket
rather than in the page, and every value snaps to the host page's own token
scales.

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
bar shows the hostname. `<meta name="g-command">` is the g-command-web origin
the ticket count and the "Command centre" link go to. Without it the count is
plain text and the link is left out.

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

## Measuring

Selection answers "what is this one", x-ray answers "what is all of it", and
measuring answers "how far apart are these two", which is the question a
spacing decision actually turns on and the one thing devtools will not answer.

- **Hovering means two different things.** With nothing selected it shades the
  hovered element's own box model, as it always did. With something selected
  it measures the selection against whatever the pointer is over, and the
  shading gives way to the measurement, because two box models on screen at
  once is not a reading anybody can take.
- **Two geometries, because they are two questions.** Boxes that face each
  other across a gap get the gap. Boxes that overlap, which is the common case
  of an element inside its container, get the four edge offsets, which is the
  padding question asked from outside. The line runs through the part the two
  boxes share, or through the selection's own middle when they share nothing.
- **A distance of zero is not drawn.** Two edges that touch are already
  legible, and a zero-length line with a chip on it is not.
- **A stop is only named when the gap is near it.** Within a quarter of the
  stop's own value, floor of 2px: 13 reads as a near miss on sp-3, and 109 gets
  the number alone rather than claiming to be sp-8. Anything not exactly on a
  stop takes the warning tint either way, which is the same signal the steppers
  give.
- **The chip on a gap is a jump, not a label.** A number is only worth having
  if you can reach the declaration that produced it, so clicking one selects
  the element that owns the gap, opens the pane its property lives in and
  flashes the row. The precedence is the order the browser resolves them in.
  Between a child and its container's edge: the container's padding on that
  side, else the child's margin on that side, else the container's own
  alignment where it is flex or grid. Between two siblings: the container's
  `gap` where there is one, else the facing margin, taking the first in
  document order unless its margin is zero and the other's is not, because an
  answer naming a margin of zero is not a diagnosis. Two boxes that overlap
  without one containing the other are almost always a positioned box on its
  inset, which is what it says.
- **Where the answer is not the only one, the hint names the other.** "or
  div.tile's margin-right" is the difference between a diagnosis and a guess,
  and a container's padding with a child's margin on top of it is one gap with
  two owners.
- **The container's own `gap` has no row in the inspector**, so that case
  flashes the whole Alignment pane rather than pointing at justify or align,
  which would be false precision about which control moves it.
- **The reading holds while the pointer is on a chip.** Reaching a chip means
  crossing the gap, and what lies under a gap is not what was being measured;
  without that the chip walks away from the pointer on the way to it.
- **The chips are hit-tested, not clicked.** `.ga-hit` covers the viewport and
  sits above the box layer, which is what keeps every box decoration free of
  pointer-events, so the chip rects are tested against the point in the stage's
  own handlers instead. The owner is stored as a thunk beside each chip:
  working it out costs several computed-style reads, and the pointer redraws
  this on every frame it moves.

## Text, hide, multi-select

Three features that all had to become pending edits or not exist. The rule is
in `applyEdit`: if it cannot be expressed as a record that reverts and saves,
it does not go in.

- **Text is the one edit with no CSS property behind it.** It is recorded as
  `{prop: "text", from, to}`, which the contract already allows, and written to
  the node rather than to its style. Two things follow. It cannot be mirrored
  into the pending stylesheet, so a text edit is the one edit a re-render takes
  with the node it replaces. And the tool only takes an element whose whole
  content is text, because that is the only shape a from and a to can describe
  without throwing away the page's markup.
- **The text tool is edit mode's, not a fourth mode.** It needs the selection,
  the pending list and the save button, and a fourth radio would have to borrow
  all three. Same shape as the x-ray lens: a switch in the bar, `t` from the
  keyboard, and switching it on from rest enters edit mode.
- **Hide is `display: none` through the ordinary path.** It reverts, it shows
  in the pending list, and the ticket carries it as a declaration a baking
  agent can act on. Removing the node would be none of those things.
- **Multi-select keeps a primary.** The first click stays the one the head, the
  crumbs, the box model and every number in the sidebar point at; shift, cmd or
  ctrl adds the rest. The controls write the primary's value to all of them, so
  a stepper means "make them all this" rather than "move each of them by that
  much", which is the only reading that matches a stepper showing one number.
- **A multi-selection says what its elements have in common**, because that is
  the thing worth knowing about a set: the tag every one of them shares plus
  the classes all of them carry, or the tags it is mixed from. Three boxes that
  are all `button.btn.btn-secondary` are one class waiting to be changed, and
  three of three different tags are three separate edits that happen to be
  selected together. Where they share a tag and at least one class the head
  offers to take everything else like it on the page, up to `MAX_ELEMENTS`,
  saying so when that cap bites: a selection that stopped at eight in silence
  would be a ticket quietly missing half its subject.
- **The signature travels into the ticket summary**, which is free text the
  contract already allows, so a baking agent reads "6 edits on 3 elements, all
  button.btn" as one class-level change rather than three coincidences. It is
  claimed only where it is true of every element the edits touched: a shape
  covering three of four elements is worse than no shape at all.
- **The multi-select ticket falls out for free.** `pending` is keyed
  `selector|prop` and `touched` is keyed by selector, so one control writing to
  three elements already produces three records and three elements without the
  save path knowing anything about it.

## Keys

`?` (shift and slash, read both ways because layouts disagree) opens a sheet
listing every binding. It is built from the shipped pane stack, so the list
lives in one array, `HELP`, and the sheet renders it.

- **The single letters work from rest**, because `a` and `e` are how a mode
  starts. They do not work while a field has focus, while a line of text is
  open, or while the composer is up: every one of them leaves the mode, and
  leaving reverts the edits the composer is about to save.
- **`m` and `p` focus the pane, not its first field.** A field would make the
  next letter a typed character, and `m` then `p` is the whole point of having
  both. Tab from the pane title reaches the controls.
- **Modifiers are left alone.** cmd, ctrl and alt combinations belong to the
  browser and to the walk.

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
  overlapped stack in the left column and caps the row that has to be clicked
  twice in a row at 640px. It is also why the first click of a demo works and
  the second does not: the first one opens the inspector over the second
  target. The legend moves out from under the inspector with a sibling rule,
  which is why it is appended last.
- **The stage is the layer that has to stand down for a caret, not the hit
  layer.** `.ga-hit` never declares `pointer-events` and the property is
  inherited, so switching off the one node that covers the viewport switches
  off both, where switching off the hit layer alone leaves the stage eating
  every click. While it is down the page is back in reach of its own handlers,
  so `textOutside` swallows the whole closing gesture, pointerdown, mousedown
  and click: closing on the pointerdown puts the stage back before the click is
  dispatched, and a link whose mousedown the page saw would navigate out from
  under an unsaved edit.
- **Authored HTML is indented, so a paragraph's raw text carries newlines.**
  They render as one space and would make a ticket unreadable, so a text record
  keeps the collapsed form on both sides. The exact original is held separately
  for the duration of the edit, which is what esc puts back.
- **A hidden element has no box.** Nothing is drawn for it and the head says
  "Hidden": a collapsed outline at the top left corner of the screen would be a
  lie about where the element is.
- **The stepper takes a unit.** `font-weight: 400px` is not a declaration, so
  the weight stepper passes an empty one. Anything else added to the type pane
  has to decide the same question.
- **The family picker offers tokens and nothing else.** It scans the host
  page's `:root` for `--font-*`, falling back to the three g names, and writes
  `var(--font-mono)` rather than a font name, so the value in the ticket is one
  the design system has. A page that resolves none has no row.
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
  wins, so a project that rebranded g-design gets an overlay in its own accent
  and everything else stays g-design. A page that resolves none of them is
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

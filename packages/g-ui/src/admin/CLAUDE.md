# g-admin (client)

The admin-only overlay: a bar, an annotate mode and a devtools-like edit mode,
for any g project. **Nothing here writes to source.** Every saved annotation or
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

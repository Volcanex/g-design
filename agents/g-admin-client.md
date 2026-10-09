# Agent kickoff: g-admin client

You are an agent in a git worktree off `main` in `g-design`. Read
`agents/CLAUDE.md` first, and `agents/g-admin-contract.md`. The
contract is binding. Load the `g-design` skill before any UI work.

## The goal

Build the vendored g-admin overlay: activation stub, admin bar,
annotate mode, edit mode with a token-snapping sidebar. Framework-free,
same discipline as the rest of `packages/g-ui`. Study the two existing
implementations first and lift what works:
`client/src/admin/annotate.tsx` in gp-poker (selector walk,
pen/drawing capture, rect+viewport capture) and, read-only, Baseline's
`static/js/annotate.js` + `core/api/annotations.py` (element HTML capture,
severity/kind, brief rendering).

## Deliverables

- Activation stub (~1KB) added to the `g-ui.js` build: localStorage
  arm/disarm via `?gadmin=1`, verify probe, inject-on-200. Zero cost to
  public visitors.
- `g-admin.js` + `g-admin.css` as **separate dist files**: new build
  entries in `scripts/build.mjs`, added to the vendor list in
  `scripts/vendor.mjs`. Never concatenated into the public bundle.
- Admin bar: fixed top, shows project/page, mode toggles (annotate /
  edit / off), unbaked-ticket count from `{base}/tickets?status=open`,
  link to the g-command-web dashboard named by `<meta name="g-command">`.
- Annotate mode: hover outline, click to pin an element (multi-element
  supported), optional pen strokes rasterized to PNG data URL (lift
  poker's approach), note field, severity/kind pickers, scope toggle
  (this page / site-wide), POST as ticket per the contract.
- Edit mode: hover outlines with margin/padding shading, click to
  select, right sidebar showing the box model + computed values.
  Controls: spacing (margin/padding per side) snapped to the `--sp-*`
  scale read from the host `:root` with raw-value escape hatch that is
  visibly flagged as off-scale; text-align and flex justify/align
  toggles; font-size/line-height steps; arrow-key nudging on the
  selected element. Every change applies live to the DOM and
  accumulates in a pending edit list; "save" opens the same note/scope
  form and POSTs one ticket carrying all `edits`.
- Docs card in `apps/docs` like every other component.

## Constraints

- Sidebar and bar are g-styled but self-contained: own scoped tokens,
  must render correctly on a page that never loaded g.css.
- All copy sentence case; no em dashes, no middle dots, no emoji.
- Shadow DOM or a hard namespace root for the overlay so host styles
  and overlay styles cannot bleed either way.
- No screenshots of the page; element `html` capture per the contract.
- No agent/AI calls from the client. It authors tickets, nothing else.

## Acceptance

- `node scripts/build.mjs` produces `dist/g-admin.js`/`.css`; vendor.mjs
  copies them; public `g-ui.js` grows by no more than ~1KB gzipped.
- Demo page in `apps/docs` where the full flow works against a mocked
  `{base}` (verify, create, list).
- Docs card added; CLAUDE.md files updated; contract file untouched (if
  you had to deviate, stop and say so in the PR instead).

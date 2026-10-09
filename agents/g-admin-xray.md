# Agent kickoff: g-admin x-ray mode and layer walking

You are an agent in a git worktree off `main` in `g-design`. Read
`agents/CLAUDE.md`, then `packages/g-ui/src/admin/CLAUDE.md` and the
existing `g-admin.js`/`g-admin.css`. This extends the shipped overlay,
matching its patterns exactly. Load the g-design contract by reading
/root/.claude/skills/g-design/SKILL.md. The contract file
`agents/g-admin-contract.md` is unaffected (no API changes).

## The goal

The owner's feedback after first live use on poker: selection-only
discovery is too slow. They want to SEE the whole layout at once and
move through it like layers.

1. **X-ray mode**: a bar toggle (works alongside annotate and edit
   modes) that paints every visible element's box at once: outline per
   box, margin and padding shaded in two distinguishable tints
   (devtools convention, g palette), so the page reads like a
   blueprint. Nesting depth should be legible (vary outline
   alpha/weight by depth, or tint steps). Include a legend chip.
2. **Layer walking**: with the overlay active, `[` and `]` (or
   up/down) walk the selected element's ancestry parent/child;
   alt+click or repeated clicks at the same point cycle through
   `document.elementsFromPoint()` so overlapped/covered elements are
   reachable; the sidebar gains a clickable breadcrumb strip of the
   ancestry chain (tag.class fragments, devtools-style). Esc steps
   back out. Works in edit mode so a walked-to element is immediately
   editable.

## Implementation constraints

- Render x-ray on a single full-viewport canvas inside the existing
  shadow root: one pass over elements drawing rects from
  getBoundingClientRect + computed margin/padding. Repaint throttled
  on scroll/resize and via a MutationObserver. Never attach
  per-element DOM decorations: hundreds of nodes would kill layout.
- Skip invisible/zero-size elements and the overlay's own nodes; cap
  the walk sensibly on huge pages (paint what intersects the
  viewport).
- Stretch (only if it lands cleanly): flag edges that sit off the 4px
  grid in a warning tint, using the same rules as
  `packages/g-ui/scripts/rhythm-audit.mjs`. Off-scale is a signal
  the owner acts on.
- All new code stays in the admin-only files. `dist/g-ui.js` gzip must
  not grow (the stub is untouched); the build's 23KB gate stays.
- Keyboard handling must not fight the page: listeners bound only
  while the overlay is active, and never when focus is in an input.
- Copy sentence case; no em dashes, middle dots, or emoji.

## Acceptance

- `node scripts/build.mjs` passes all gates.
- Docs card updated: the mocked demo shows x-ray on a nested layout
  and layer-walking through an overlapped stack.
- Playwright pass against the docs card covering: toggle on/off,
  margin vs padding tints present, breadcrumb reflects ancestry,
  [/] walking changes selection, alt-click cycles a covered element,
  edit sidebar follows the walked selection, zero console errors.
- Screenshots eyeballed in dark and light.
- CLAUDE.md files updated; prune anything your change obsoletes.

NEVER push to main. Push feat/g-admin-xray and stop; no PR. Report
tersely: branch, files, what you verified by running it, decisions the
brief didn't cover.

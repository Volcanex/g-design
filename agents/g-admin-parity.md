# Agent kickoff: g-admin parity pass (VisBug-class interactions)

You are an agent in a git worktree off `main` in `g-design`. Read
`agents/CLAUDE.md`, `agents/g-admin-contract.md`, then
`packages/g-ui/src/admin/CLAUDE.md` and the current g-admin.js/css.
This brief REQUIRES the x-ray/layer-walking branch to be merged first;
if `drawEditBoxes` has no x-ray/canvas machinery yet, stop and report.
Load the design contract: /root/.claude/skills/g-design/SKILL.md.

## The goal

Close the interaction gap with VisBug (the open source reference:
github.com/GoogleChromeLabs/ProjectVisBug) while keeping our two
differentiators: every change lands as a ticket, and every value snaps
to the g token scales. Six features, in priority order:

1. **Measure**: with an element selected, hovering another element
   shows the pixel gaps between their edges drawn on the overlay, each
   gap labelled with its px and nearest spacing token, off-scale gaps
   in the warning tint. This is the feature the owner will use most.
2. **Text editing**: a bar/tool mode (hotkey `t`). Click text, edit it
   in place (contenteditable on the host element, restored on cancel),
   save produces a ticket with kind `content` and an edits record
   `{prop: "text", from, to}`. The server accepts arbitrary prop
   strings already; no contract change.
3. **Hide element**: with a selection, `delete` key hides it
   (display: none via the same pending-edit path, so it reverts and
   tickets like any other edit).
4. **Multi-select**: shift+click adds to the selection; spacing and
   alignment controls apply to every selected element; the saved
   ticket carries all elements and one edits record per element+prop.
5. **Tool hotkeys**: single letters while the overlay is active and
   focus is not in an input: `a` annotate, `e` edit, `x` x-ray toggle,
   `t` text, `m`/`p` focus the margin/padding pane of the sidebar,
   `esc` steps out (existing behaviour), `shift+/` opens a help sheet
   listing every binding (a .g-pane overlay, sentence case).
6. **Type pane upgrade**: font-weight stepper and, when the host page
   defines font tokens (--font-ui, --font-mono, --font-display or
   similar on :root), a family picker limited to those tokens.

## Constraints

- Everything stays in the admin-only files; the public g-ui.js gzip
  gate must not move.
- Match the existing code's structure and the shadow-root discipline;
  reuse the pending-edit machinery for every mutating feature: if a
  feature cannot express itself as pending edits + ticket, redesign it
  until it can, or drop it and say so.
- No hue/shadow/image-replace/responsive tools: deliberately out.
- Sentence case, no em dashes, no middle dots, no emoji.

## Acceptance

- `node scripts/build.mjs` passes all gates.
- Docs card demo covers measure, text edit, hide, multi-select, the
  help sheet, and hotkeys; Playwright pass over all of it plus: text
  cancel restores the original, hidden element reverts, multi-select
  ticket carries per-element edits, hotkeys ignored while typing.
- Screenshots eyeballed dark and light.
- CLAUDE.md files updated; prune what you obsolete.

NEVER push to main. Push feat/g-admin-parity and stop; no PR. Report
tersely: branch, files, verification evidence, anything dropped and why.

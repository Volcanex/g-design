# g-system

**Owner:** Gabriel Penman
**What:** The design language that replaces both `g-design-language`
(OS-zine) and the discarded `g-design-neutral` draft as the base for new
work. Built to the "g-system design language: build brief" (2026-09).
`packages/g-tokens` is the product; `packages/g-icons` the animated icon
set; `packages/g-ui` the framework-free layer (plus `src/components/`
fragments); `packages/g-ui-react` the React layer; `apps/docs`
demonstrates it.

## Gotchas

- `dist/`, `apps/docs/assets/`, `apps/docs/react/` and `apps/docs/r/` are
  **generated**. Edit sources under `packages/` and run
  `node scripts/build.mjs`. The build gates on the AA contrast script and
  the stylelint greys rule, and reports perf budgets (warn over budget,
  hard fail at double). Fix the source, never the gate.
- Dark is the hard default (`:root`). No attribute means dark,
  `data-theme="light"` light, `data-theme="system"` follows the OS.
- The aliasing layer is declared on `:root, [data-theme]`, not `:root`
  alone: var() substitutes where a property is declared, so theme islands
  silently stay dark otherwise.
- Status text (`--ok-text` etc.) and the chart palette (`--chart-1..6`)
  are DERIVED at build time to clear contrast on their real surfaces.
  Never point components at raw scale steps.
- The greys rule is enforced by stylelint; `greys.card.html` is the one
  ignored file (it documents the forbidden steps).
- g-icons sources are stroke geometry with `data-part` groups; see
  `packages/g-icons/CLAUDE.md` for the hand-drawing format. Animation
  state CSS lives in g-ui.css. State rules must target
  `[data-part="..."] path`, NOT `path[pathLength]` tails: attribute-flip
  invalidation misses the latter in Chromium and the draw never fires.
- Component fragments: `packages/g-ui/src/components/*.css|js` are
  concatenated into the built assets; JS fragments register through
  `g.use((root) => ...)` so they re-init on every g.swap. Guard elements
  with a data-init attribute.
- Fonts ship SUBSETTED (latin + latin-ext + punctuation, cv05/cv11/tnum
  kept) via pyftsubset in the build; originals stay in
  `packages/g-tokens/fonts/`. An Arial-based metric-matched fallback
  prevents swap shift.
- MPA view transitions are on by default (`@view-transition` in g-ui.css)
  with a two-page demo at `guidelines/vt/`. Cross-document transitions
  need same-origin real navigation; the pane iframe still shows them.
- The app shell is `.g-shell`: persistent chrome, off-canvas sidebar
  sheet under 720px behind `.g-scrim`, toggled by `.g-nav-toggle`
  (gi-list morphs to an x). Do NOT put a box-shadow on the open sheet: a
  software-raster compositing bug washes the whole layer light.
- Voice rules are enforced in copy: sentence case with a leading capital,
  no em dashes anywhere, hyphens only in technical terms.
- Base UI is `@base-ui/react` (1.x stable), not `@base-ui-components/react`.
- number-flow is vendored; its bare `esm-env` import resolves via an
  import map the build writes. Module scripts need HTTP.
- `*.card.html` need the first-line `<!-- @dsCard ... -->` comment; the
  build re-pins it onto the vite-built `react/index.html` if stripped.
- Synced to the "g-system" Claude Design project via DesignSync,
  incrementally. Old hashed `react/assets/` files accumulate there; prune
  in a plan's deletes occasionally.
- Verification pattern: serve `apps/docs` over local HTTP and screenshot
  with Playwright (file:// blocks module scripts). The robustness card's
  gauntlet must end "All pass". Do not trust PIL pixel-sampling of the
  screenshots without stripping the colour profile; eyeball the images.

# g-design

Was `g-system` until 2026-10-09; G-System now names the whole supersystem.
The manifest id, the `design = "g-system@<version>"` label and the
`g-system` compat symlink on h keep the old name. The CSS
prefixes, custom element names and file names (`g.css`, `g-ui.js`,
`g-admin.*`) never carried it. The one package name that did,
`@g-system/ui-react`, is now `@g-design/ui-react`, and nothing outside
this repo imports it.

**Owner:** Gabriel Penman
**Licence:** PolyForm Noncommercial 1.0.0 (`LICENSE`), source-available.
Fonts, icon glyphs and vendored libraries keep their own licences, listed in
`THIRD_PARTY_NOTICES`. `OFL.txt` travels with the fonts into every copy.
**What:** The house design language. It replaces `g-design-language`
(OS-zine) and the discarded `g-design-neutral` draft as the base for ALL
new g work. Built to the "g-system design language: build brief" (2026-09).
`packages/g-tokens` is the product; `packages/g-icons` the animated icon
set; `packages/g-ui` the framework-free layer (plus `src/components/`
fragments); `packages/g-ui-react` the React layer; `apps/docs`
demonstrates it.

## Using g-design in a project

One command vendors the built assets into a consumer:

    node scripts/vendor.mjs <target-static-dir>

That copies `g.css`, `g-ui.js` and `fonts/` (stamped with the version) into
the target. The consumer links two files and is done. Copying is deliberate:
no runtime coupling back to this repo, the redundancy is safe. Re-run to
update. Declare `design = "g-system@<version>"` in the consumer's
`[tool.gcore]`: the label keeps the old name because the lineage graph
links it to the `g-system` manifest id.

**The component hierarchy is not a suggestion.** When designing with
g-design, in strict order:

1. Use the existing component as it ships.
2. Adjust what it exposes: size classes, density, text, spacing tokens,
   the accent slot for a rebrand.
3. Extend it: a new variant built from the same tokens and patterns.
4. Build new ONLY when nothing close exists, and then build it here in
   `packages/g-ui/src/components/` with a docs card, so the next project
   gets it for free. New one-off components living in a consumer repo are
   a defect.

Hard rules that travel with the assets: sentence case everywhere (a
leading capital, then lowercase; no title case, no ALL CAPS), em dashes
and middle dots banned, greys only through the alias tokens, verb-first
buttons, dark is the default, layout on the 4px grid, and **markdown
renders only inside `.prose`** (everywhere else is plain text, flattened
with `g.plain()`). The reference is `apps/docs` (every component has a
card), and the full contract is the `g-design` skill in g-env.

## Layout discipline

Everything vertical comes off one 4px grid: the spacing scale `--sp-1` to
`--sp-8`, pixel line-heights `--lh-1` to `--lh-5` (never a ratio, which is
what put 13px rows on 19.5px), the control and row height scale `--h-1` to
`--h-5`, the breakpoint-aware `--gutter` and the `--col-*` measures.
`.g-page` is the container that applies them. The guideline card is
`apps/docs/guidelines/layout.card.html`.

Check a page against it, here or in a consumer:

    node packages/g-ui/scripts/rhythm-audit.mjs <url> [--viewport 1280x800]
                                                [--theme light] [--max N]

It reports edges off the grid (from their own container, and from the top
of the page), half-pixel edges, and sibling gaps off the spacing scale,
grouped by selector. `--max` makes it a gate for an e2e suite. It needs
playwright, which is a devDependency here and is expected to be one in the
consumer that runs it.

## Gotchas

- `.prose` is the only markdown-rendering surface. Titles and summaries
  are routinely lifted from the first line of an authored body, so raw
  `**`, backticks and `[[wikilinks]]` arrive at table cells, badges and
  page headings, where they render as literal characters. `g.plain()`
  flattens a markdown string to one line of label text; call it at the
  boundary rather than trusting the source. It also sweeps the unmatched
  opener a truncated title leaves behind, which is the case that actually
  ships (see the Prose guideline card).

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
- The g-admin overlay (`packages/g-ui/src/admin/`, its own CLAUDE.md) is the
  one thing that does NOT ride in the bundle. `dist/g-admin.js|css` are
  separate files, vendored beside `g-ui.js` and fetched only for a verified
  admin; only a ~0.9KB activation stub ships in `g-ui.js` (it also carries the
  cmd+shift+K toggle, which has to work before the overlay exists), gated by a
  `g-ui.js gzip` budget in the build. Its CSS is the whole design system with
  every selector re-scoped from `:root` to `:host`, because it renders in a
  shadow root on pages that may never have loaded g.css.
- Component fragments: `packages/g-ui/src/components/*.css|js` are
  concatenated into the built assets; JS fragments register through
  `g.use((root) => ...)` so they re-init on every g.swap. Guard elements
  with a data-init attribute.
- Fonts ship SUBSETTED (latin + latin-ext + punctuation, cv05/cv11/tnum
  kept) via pyftsubset in the build; originals stay in
  `packages/g-tokens/fonts/` beside `OFL.txt`. The build copies `OFL.txt`
  into every font folder it writes, and vendor.mjs carries it on to
  consumers. `packages/g-tokens/dist/fonts/` and
  `packages/g-ui-react/demo/public/fonts/` are build intermediates and
  gitignored. An Arial-based metric-matched fallback prevents swap shift.
- MPA view transitions are on by default (`@view-transition` in g-ui.css)
  with a two-page demo at `guidelines/vt/`. Cross-document transitions
  need same-origin real navigation; the pane iframe still shows them.
- Editor chrome ships as fragments (2026-09): `menubar` (`.g-menubar` of
  `.g-menubar-item[popovertarget]` over the ordinary `.menu`, plus
  `.menu-heading`), `pane` (`.g-pane-stack` > `.g-pane` with a
  `.g-pane-title[aria-expanded]` and `.g-pane-body`; `.g-splitter` resizes
  a neighbour and reports `g-splitter:resize`), `tree` (flat `.g-tree-row`s
  with `--depth`, `data-drop="before|into"`, `g-tree:toggle`), `swatch`
  (`.g-swatch` with the colour in `--swatch`, `.g-swatch-pair`,
  `.g-swatch-grid`) and `segmented` (native radios, CSS only). Consumers
  that render these from a template (lit-html and friends) must call
  `g.init(root)` after the first render; every fragment guards with a
  `data-*-init` attribute, but core `initMenu` does not, so render a
  `.menu` once and keep the element.
- The app shell is `.g-shell`: persistent chrome, off-canvas sidebar
  sheet under 720px behind `.g-scrim`, toggled by `.g-nav-toggle`
  (gi-list morphs to an x). Do NOT put a box-shadow on the open sheet: a
  software-raster compositing bug washes the whole layer light.
- Voice rules are enforced in copy: sentence case with a leading capital,
  no em dashes and no middle dots anywhere, hyphens only in technical
  terms. The middle dot is a separator doing a layout job: use a gap off
  the spacing scale, a column, a new line, or words.
- Base UI is `@base-ui/react` (1.x stable), not `@base-ui-components/react`.
- number-flow is vendored; its bare `esm-env` import resolves via an
  import map the build writes. Module scripts need HTTP.
- `*.card.html` need the first-line `<!-- @dsCard ... -->` comment; the
  build re-pins it onto the vite-built `react/index.html` if stripped.
- Synced to the Claude Design project (still named "g-system") via DesignSync,
  incrementally. Old hashed `react/assets/` files accumulate there; prune
  in a plan's deletes occasionally.
- Verification pattern: serve `apps/docs` over local HTTP and screenshot
  with Playwright (file:// blocks module scripts). The robustness card's
  gauntlet must end "All pass". Do not trust PIL pixel-sampling of the
  screenshots without stripping the colour profile; eyeball the images.

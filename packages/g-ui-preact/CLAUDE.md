# g-ui-preact

The shared app view kit: Studio's look, lifted out of g-studio/web so G-Command
and any other g app wear the same shell. It was extracted, not redesigned:
every rule and component came over verbatim, and Studio's built CSS is the
same rule set before and after.

## What is here (`src/`)

- `kit.css` the app shell look on g.css classes, alias tokens only: shell
  (sidebar, brand, nav items and heads, user foot, top bar, nav sheet),
  content page widths, page head, layout helpers (row, stack, muted, ...),
  cards (card-head, flush), lists, facts, cols-2, empty, error and skeleton
  states, fields and form grid, links, dialog sizes, menu headings,
  disclosure rows, phone rules (hide-sm, show-sm), the rail skeleton, and
  tile grids. Plain HTML can link it after g.css: no component needed.
- `html.js` htm bound to Preact, plus the hooks the kit uses.
- `icon.js` `Icon` and `setIcons(map)`. The kit carries no glyph data; the
  app registers the Phosphor paths it uses once at startup.
- `core.js` `configure`, `toast`, `toastOk`, `toastError`, `showToast`,
  `escapeHtml`, `rawOf`, `sendable`, `ReportButton`, `Dialog`, `Confirm`,
  `Button`, `IconButton`, `CopyButton`, `fallbackCopy`, `Menu`, `Empty`,
  `ErrorState`, `SkeletonRows`, `Loaded`, `PageHead`, `Field`, `Badge`,
  `useId`, `useEvent`, `useDebounced`, `useGInit`, `useToggle`.
- `shell.js` `AppShell`, `NavItem`, `NavToggle`, `useNavSheet`, `Brand`,
  `UserFoot`, `currentTheme`, `setTheme`, `themeMenuItem`.
- `index.js` all of the above.

## Using it

    node scripts/vendor-preact.mjs <consumer-dir>    (from the g-design repo)

Copies `src/` into the consumer, each file stamped with the g-design version.
Copying is deliberate, as with `vendor.mjs`: no runtime coupling back. The
JS is ESM source with bare `preact`, `preact/hooks` and `htm` imports, so it
needs a bundler (esbuild in Studio) or an import map, and no build step here.
Not wired into `scripts/build.mjs`; there is nothing to build.

The app wires itself in at startup:

    setIcons(paths);                        // the glyphs it draws
    configure({ report, reportLabel, reportedLabel, offlineTitle });

`report(err)` resolves true when an error was sent somewhere; without it no
error shows a report button. App knowledge (routes, the session, who to send
errors to, product copy) stays in the app and comes in as props: `Brand`
takes `href` and `name`, `UserFoot` takes the person and the menu items,
`AppShell` takes `brand`, `nav`, `foot`, `topbar` and `closeKey` (the route,
so the phone sheet closes on navigation).

## Rules

- Change a rule here, not in a consumer's vendored copy, then re-vendor.
  A consumer's override after `kit.css` is fine; a fork is a defect.
- Dependencies point one way: this package imports nothing from any app.
- Anything new follows the g-design component hierarchy (use, adjust,
  extend, build new last) and the voice rules in copy.

## Gotchas

- Studio imports `kit.css` first in its app.css, ahead of its own
  styles, so Studio overrides still win on equal specificity.
- `.tile-num` keeps a `1.1` line-height ratio from Studio, off the pixel
  line-height rule; fixing it changes Studio's tiles, so do it on purpose.
- `body { overflow: hidden }` and the `#app` height stay in each app:
  the shell expects a fixed-height page so `.content` scrolls, and an app
  decides that for its own document.

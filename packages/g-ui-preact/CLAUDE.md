# g-ui-preact

The shared app view kit: Studio's look, lifted out of g-studio/web so G-Command
and any other g app wear the same shell. It was extracted, not redesigned:
every rule and component came over verbatim, and Studio's built CSS is the
same rule set before and after.

## What is here (`src/`)

- `kit.css` the app shell look on g.css classes, alias tokens only: shell
  (sidebar, brand, nav items and heads, user foot, top bar, nav sheet),
  content page widths, page head (one row, its h1 `.sr-only` because the top bar names the
  page), section heads (`.section-head`, `.section-sub`: one rhythm for every page), layout helpers (row, stack, muted, ...),
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
  `Dialog` (and `Confirm`) keeps its body rendered through the masked exit
  after `open` turns false, then calls `onExited`. Never mount a dialog only
  while it is open (`${x && html`<${Dialog} open=${true}>`}`): the close has
  nothing to animate. Keep it mounted with `open=false` and clear `x` in
  `onExited`.
- `shell.js` `AppShell`, `NavItem`, `NavGroup` (one level of nesting: a disclosure row, open
  by default, never a page), `NavToggle`, `useNavSheet(closeKey, ref?)` (state only: the
  shell renders `data-nav-open` itself), `useDock(ref, opts)`, `Brand`, `RailToggle`,
  `UserFoot`, `currentTheme`, `setTheme`, `themeMenuItem`. `AppShell` wires its own dock
  (`dock=false` leaves it out); a screen that draws its own `.g-shell` calls `useDock`.
- `rail.js` the rail, plain DOM with no imports: `wireRails`, `wireRailToggle`, `wireGroups`,
  `applyRail`, `railPinned`, `setGroupOpen`, `groupOpen`. A server-rendered page loads it as
  a module; `Brand` (with `RailToggle`), `AppShell` and `NavGroup` use it in Preact. From 721px
  the rail is collapsed to icons by default; a 150ms rest of the pointer, or keyboard focus,
  opens it over the content (`data-rail-peek`, no reflow), and it closes 300ms after the
  pointer leaves, when focus leaves, or on Escape. The button beside the brand pins it open
  ("Keep open", the content then makes room) and collapses it again ("Collapse"). Pinned is
  remembered per viewer under a `railKey` in localStorage (value `pinned`), closed groups under
  `<railKey>:closed`; every access is guarded.
  `wireDock(shell, {key})` (also run by `wireRails` for every shell whose aside has
  `a.nav-item[data-pin]`) draws the dock and Go (g-navigation R1a): `nav.g-dock` and
  `dialog.g-palette[data-palette]` appended to the shell; shell attributes `data-dock`,
  `data-go`, `data-go-open`, `data-dock-typing`, and `data-dock-guest` on a host whose content
  holds a docked shell; slot memory and history in sessionStorage under `<key>:dock:*`;
  events `g-dock:navigate` (cancelable, `{href, replace}`), `g-palette:open`,
  `g-palette:close`. It returns `unwire()`. Go lists every place at once (the rail's tree,
  groups open; typing filters). A touch on a dock slot acts on pointerdown, the click after it
  is spent. Inside an iPhone shell (`html[data-gshell]`) kit.css draws the dock as a
  translucent material the page runs on under, and the top bar without its rule ("native:
  the phone shell"); g.css carries the token half (`components/native.css`). Two copies of rail.js on one page (Command and
  Studio's bundle) coordinate only through those attributes and sessionStorage. A rail with
  no pins keeps the phone sheet with the whole tree.
- `cursor.js` your own cursor, plain DOM with no imports: `wireOwnCursor`,
  `paintOwnCursor`, `cursorSvgs`, `cursorUrl`, `cursorRgb`, `ownCursorColor`,
  `CURSOR_KEY`, `DEFAULT_CURSOR`. Studio's coworking pointer as every app's default,
  tinted from the coworking palette in kit.css (red until a colour is picked, read from
  Studio's `gs.cowork-color` key). No presence, only the pointer.
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
    configure({ report, reportLabel, reportedLabel, offlineTitle, errorCopy, errorFallback });

`report(err)` resolves true when an error was sent somewhere; without it no
error shows a report button. App knowledge (routes, the session, who to send
errors to, product copy) stays in the app and comes in as props: `Brand`
takes `href` and `name`, `UserFoot` takes the person, the menu items and
`menuSide`, `AppShell` takes `brand`, `nav`, `foot`, `topbar` and `closeKey`
(the route, so the phone sheet closes on navigation). `errorCopy` maps an
error code to `[title, sentence]` for `ErrorState`; with it the server's terse
message moves under Details.

## Rules

- Change a rule here, not in a consumer's vendored copy, then re-vendor.
  A consumer's override after `kit.css` is fine; a fork is a defect.
- Dependencies point one way: this package imports nothing from any app.
- Anything new follows the g-design component hierarchy (use, adjust,
  extend, build new last) and the voice rules in copy.

## Gotchas

- The rail never moves what it holds: everything in the aside keeps its open-width layout
  (`.g-shell > aside > *` is `--rail-w` less the padding) and the collapsed rail only clips
  it, with labels faded. A child's icon sits 4px past the group's guide line, which drops
  from the parent's icon, so it is in the same place collapsed and open. Keep a new rail
  element inside that geometry, or opening the rail will slide it.
- Two shells on one page (Studio inside Command) each wire their own rail; every rule and
  listener keeps to its own `:scope > aside`, so hovering one never opens the other. Give
  each its own `railKey`.
- The dock and the phone palette are `position: fixed` inside their shell. A guest shell
  under an ancestor with a transform, filter, `contain` or `will-change: transform` would
  pin them to that ancestor instead of the screen. Command's `.studio-host` entrance
  (`g-vt-in`, 4px, fill `both`) moves the guest dock with it for its 200ms, while the dock
  fades in; once it ends the dock sits on the screen's foot (measured in WebKit). A lasting
  transform would not.
- `g-ui.js` skips `dialog.cmdk[data-palette]`: the Go palette wires its own Cmd+K. A page
  that also has its own `dialog.cmdk` gets both on Cmd+K.

- Studio imports `kit.css` first in its app.css, ahead of its own
  styles, so Studio overrides still win on equal specificity.
- `.tile-num` keeps a `1.1` line-height ratio from Studio, off the pixel
  line-height rule; fixing it changes Studio's tiles, so do it on purpose.
- `body { overflow: hidden }` and the `#app` height stay in each app:
  the shell expects a fixed-height page so `.content` scrolls, and an app
  decides that for its own document.

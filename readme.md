# g-system

The shared design language for everything Gabriel builds. Neutral, calm,
polished software: Radix slate on a dark default, Inter from State, alpha
fills and borders, motion that answers actions.

## Shape

- `packages/g-tokens` — the product. `scripts/build-tokens.mjs` generates
  `dist/tokens.css` from `@radix-ui/colors` (never hand-edit the output).
  Fonts vendored from State: InterVariable, Space Grotesk, JetBrains Mono.
- `packages/g-ui` — framework-free component layer: `g-ui.css` + `g-ui.js`.
- `apps/docs` — reference cards, every example is the real component.
- `dist/` — built artifacts. `g.css` is the one-link-tag path: a static
  HTML page gets the whole system with `<link rel="stylesheet" href="g.css">`
  and optionally `<script defer src="g-ui.js">`. No build step.

Build: `node scripts/build.mjs`

## The load-bearing rules

- **The greys rule.** Radix gives twelve slate steps; the system uses six.
  Solid slate-3..7 are forbidden as backgrounds — every interaction fill and
  every border is an alpha value, so nested surfaces compose.
- **Colour means something.** Green commits, red destroys; both always solid,
  always with an icon, never used for emphasis. Not overridable.
- **The accent slot.** `--accent-fill`, `--accent-fill-hover`, `--accent-fg`,
  `--accent-edge` are the entire per-app override surface; they default to the
  contrast primary (far end of the neutral scale).
- **Themes.** Dark is the default, unconditionally. `data-theme="light"` opts
  a tree out, `data-theme="system"` follows the OS, any element can re-assert
  a mode (theme islands compose). Aliases are re-declared on `[data-theme]`
  because var() substitutes where a property is declared.
- **Elevation** is a 1px alpha border plus an inset top highlight. Drop
  shadows exist only on the floating layers (menu, dialog, toast).
- **Motion.** Two curves, four durations (100/140/200/500ms), three springs
  generated as CSS `linear()` at build time. 300ms ceiling except the sheet.
  Reduced motion falls back to crossfades.
- **Density.** `data-density="compact"` on the root remaps control heights,
  paddings and font sizes. Never a per-component prop.

## Using it in a project

```toml
[tool.gcore]
design = "g-system@0.1.0"
```

Copy `dist/` into the project's static assets. Override the four accent
variables to rebrand. Components use the aliasing layer
(`--surface-*`, `--border*`, `--fill-*`, `--text-*`) — never `slate-*` hex.

# g-design

The design language of G-System, used by every project in it. Neutral, calm,
polished software: Radix slate on a dark default, Inter, alpha fills and
borders, and motion that answers actions.

This repo is source-available under the PolyForm Noncommercial 1.0.0 licence.
It is not open source.

## Shape

- `packages/g-tokens` is the product. `scripts/build-tokens.mjs` generates
  `dist/tokens.css` from `@radix-ui/colors`. Never hand-edit the output.
  The fonts are InterVariable, Space Grotesk and JetBrains Mono, under the
  SIL Open Font License, with `OFL.txt` beside them.
- `packages/g-ui` is the framework-free component layer: `g-ui.css` plus
  `g-ui.js`.
- `packages/g-ui-react` is the React layer: thin wrappers over Base UI,
  Sonner, Vaul, cmdk, NumberFlow and Motion, all painted with the same
  tokens. `npm run build` there produces the React lab page in the docs.
- `apps/docs` holds the reference cards, and every example is the real
  component. `apps/docs/r/` is a shadcn-compatible registry, generated.
- `dist/` is the one-link-tag path: a static HTML page gets the whole
  system with `<link rel="stylesheet" href="g.css">` and optionally
  `<script defer src="g-ui.js">`. No build step. That path stays first-class.

Build everything: `node scripts/build.mjs`

The build gates itself: AA contrast is verified by script in both themes
(`scripts/check-contrast.mjs`), and stylelint enforces the greys rule.
A failing gate fails the build.

## The load-bearing rules

- **The greys rule.** Radix gives twelve slate steps and the system uses six.
  Solid slate 3 to 7 are forbidden as backgrounds. Every interaction fill
  and every border is an alpha value, so nested surfaces compose.
- **Colour means something.** Green commits and red destroys. Both are always
  solid, always with an icon, never used for emphasis. Not overridable.
- **The accent slot.** `--accent-fill`, `--accent-fill-hover`,
  `--accent-fg` and `--accent-edge` are the entire per-app override
  surface, and they default to the contrast primary.
- **Status text is derived, not picked.** Step 11 of each status scale is
  walked toward step 12 at build time until it clears 4.5:1 on its own
  wash. The solid go and danger fills hold 3:1 with a mandatory icon.
- **Themes.** Dark is the default, unconditionally. `data-theme="light"`
  opts a tree out, `data-theme="system"` follows the OS, and any element
  can re-assert a mode, so theme islands compose. Aliases are re-declared
  on `[data-theme]` because var() substitutes where a property is declared.
- **Elevation** is a 1px alpha border plus an inset top highlight. Drop
  shadows exist only on the floating layers: menu, dialog, toast.
- **Motion.** Two curves, four durations (100/140/200/500ms), three
  springs generated as CSS `linear()` at build time. Nothing over 300ms
  except the sheet. Transitions, never queued animations. Reduced motion
  falls back to crossfades.
- **Density.** `data-density="compact"` on the root remaps control
  heights, paddings and font sizes. Never a per-component prop.
- **Layout is on a 4px grid.** Spacing (`--sp-*`), line-heights in pixels
  rather than ratios (`--lh-*`), control and row heights (`--h-*`), page
  gutters (`--gutter`) and content measures (`--col-*`) all come off it,
  so two authors reach the same number without a conversation. A slot that
  is usually empty keeps its size, so its neighbours never move.
  `packages/g-ui/scripts/rhythm-audit.mjs` measures a rendered page
  against all of it.
- **Voice.** Sentence case everywhere. Capitalisation is enforced, not
  optional. Verb-first buttons. The same word survives the whole flow, so
  Publish makes Published. Em dashes are banned, and so is the middle dot:
  it is a glyph doing a layout job, and the fix is a gap off the spacing
  scale, a column, a new line, or words. Hyphens are discouraged outside
  technical terms.

## Signature interactions

The stateful buttons set the tone for the rest: copy cross-fades its two
icons in a fixed box and resets its timer on re-click. Approve starts bare
and draws its tick when clicked. Destructive actions are hold-to-delete on
a mouse, a sweep that rewinds if released early, and a two-step tap confirm
on touch, where a held finger reads as a stuck tap. Status badges blink as
they flip.
Buttons grow by 2% on hover and compress to 97% on press. Tooltips share
one 300ms warm-up and flip below when out of headroom. Toasts stack with
scale and a 14px offset, pause on hover, carry actions, and a loading
toast resolves in place. The robustness card runs the whole set under
spammed input and interrupted animation, and must stay green.

## Using it in a project

```toml
[tool.gcore]
design = "g-system@1.6.0"
```

The label still says `g-system`, the old name of this repo, because the
G-System manifest and its lineage graph key on it.

Run `node scripts/vendor.mjs <static-dir>` to copy `dist/` into the
project. Override the four accent variables to rebrand. Components use the aliasing layer
(`--surface-*`, `--border*`, `--fill-*`, `--text-*`), never `slate-*` hex.
React projects can pull components from the registry in `apps/docs/r/`.

## Licence

PolyForm Noncommercial 1.0.0, see `LICENSE`. Copyright Gabriel Penman. The
fonts, the Phosphor icon glyphs, the Radix colour scales and the vendored
libraries keep their own licences, listed in `THIRD_PARTY_NOTICES`.

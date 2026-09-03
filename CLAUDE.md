# g-system

**Owner:** Gabriel Penman
**What:** The design language that replaces both `g-design-language`
(OS-zine) and the discarded `g-design-neutral` draft as the base for new
work. Built to the "g-system design language: build brief" (2026-09).
`packages/g-tokens` is the product; `packages/g-ui` is the component
layer; `apps/docs` demonstrates it.

## Gotchas

- `dist/tokens.css` and `apps/docs/assets/*` are **generated** — edit
  `packages/g-tokens/scripts/build-tokens.mjs` or `packages/g-ui/src/*`
  and run `node scripts/build.mjs`. Never hand-edit outputs.
- Dark is the hard default (`:root`). The lock "dark is the default"
  is implemented as: no attribute → dark, `data-theme="light"` → light,
  `data-theme="system"` → follow OS. Diverges from the brief's snippet
  (which was light-first under prefers-color-scheme) on purpose.
- The aliasing layer is declared on `:root, [data-theme]`, not just
  `:root` — var() substitutes where declared, so theme islands break if
  aliases live only on the root. Keep it that way.
- The greys rule: never a solid slate-3..7 background. Fills/borders are
  the alpha steps via `--fill-*` / `--border*`. Stylelint enforcement is
  still TODO (phase 2).
- Springs are sampled into CSS `linear()` by the token build from
  visualDuration + bounce. Change the parameters there, not the output.
- Fonts are State's exact variable files (`state/app/assets/fonts`),
  woff2-compressed here. Inter is the UI face; Space Grotesk is loaded
  but opt-in via `--font-display`.
- Icon SVGs are Phosphor Regular from `@phosphor-icons/core`, inlined
  per use (tree-shaken by hand). The two CSS masks (check, caret-up-down)
  are the same glyphs as data URIs.
- `*.card.html` need the first-line `<!-- @dsCard ... -->` comment for
  the Claude Design pane. Synced incrementally via DesignSync — never
  wholesale replace.
- Phase 2 (deferred by design): React/Base UI layer, Tailwind @theme
  proof, shadcn registry, Sonner/Vaul/NumberFlow/cmdk as real deps,
  stylelint greys rule, robustness page, AA contrast script.

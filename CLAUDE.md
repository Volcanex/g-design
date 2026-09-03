# g-system

**Owner:** Gabriel Penman
**What:** The design language that replaces both `g-design-language`
(OS-zine) and the discarded `g-design-neutral` draft as the base for new
work. Built to the "g-system design language: build brief" (2026-09).
`packages/g-tokens` is the product; `packages/g-ui` the framework-free
layer; `packages/g-ui-react` the React layer; `apps/docs` demonstrates it.

## Gotchas

- `dist/`, `apps/docs/assets/`, `apps/docs/react/` and `apps/docs/r/` are
  **generated**. Edit the sources under `packages/` and run
  `node scripts/build.mjs`. The build fails on a contrast or lint failure;
  that is intended, fix the token or style, never the gate.
- Dark is the hard default (`:root`). No attribute means dark,
  `data-theme="light"` means light, `data-theme="system"` follows the OS.
  This diverges from the brief's snippet (light-first) on purpose.
- The aliasing layer is declared on `:root, [data-theme]`, not `:root`
  alone. var() substitutes where a property is declared, so theme islands
  silently stay dark otherwise. Keep it that way.
- Status text tokens (`--ok-text`, `--warn-text`, `--danger-text`,
  `--info-text`) are derived by `scripts/color-math.mjs` at build time to
  clear 4.5:1 on their wash. Never point badges at raw `--green-11` etc.
- The greys rule is enforced by stylelint; `greys.card.html` is the one
  ignored file because it documents the forbidden steps with swatches.
- Springs are sampled into CSS `linear()` by the token build. Change the
  visualDuration and bounce parameters there, not the output.
- Voice rules are enforced in copy: sentence case with a leading capital,
  no em dashes anywhere, hyphens only in technical terms.
- Base UI is `@base-ui/react` (1.x stable). The `@base-ui-components/react`
  name on npm only has prereleases and `npm install` fails on it.
- number-flow is vendored into `assets/vendor/` for the vanilla shell; its
  bare `esm-env` import resolves via an import map written by the build.
  Module scripts need HTTP, so the shell keeps static text as fallback.
- `*.card.html` need the first-line `<!-- @dsCard ... -->` comment; the
  build re-pins it onto the vite-built `react/index.html` if stripped.
- Synced to the "g-system" Claude Design project via DesignSync,
  incrementally. Old hashed `react/assets/` files accumulate there; prune
  them in a plan's deletes occasionally.
- Verification pattern: serve `apps/docs` over local HTTP and screenshot
  with Playwright (file:// blocks module scripts). The robustness card's
  gauntlet must end "All pass".

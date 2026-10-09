// Generates dist/tokens.css from @radix-ui/colors. Never hand-edit the output.
//   node scripts/build-tokens.mjs
import {
  slate, slateA, slateDark, slateDarkA,
  slateP3, slateP3A, slateDarkP3, slateDarkP3A,
  red, redA, redDark, redDarkA,
  green, greenA, greenDark, greenDarkA,
  blue, blueA, blueDark, blueDarkA,
  amber, amberA, amberDark, amberDarkA,
  violet, violetDark, teal, tealDark, crimson, crimsonDark, grass, grassDark,
} from "@radix-ui/colors";
import { ratio, mix, hex } from "../../../scripts/color-math.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveText } from "../../../scripts/color-math.mjs";

// Chart strokes: step 9 walked toward step 11 until the colour clears 3:1
// (WCAG graphical objects) on the page surface. Categorical, six of them.
function deriveChart(step9, step11, surface) {
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const c = mix(step9, step11, t);
    if (ratio(c, surface) >= 3) return hex(c);
  }
  return step11;
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---- scale emission ---------------------------------------------------------

function vars(scale, prefix, alpha = false) {
  return Object.entries(scale)
    .map(([k, v]) => {
      const step = k.replace(/^[a-zA-Z]+/, "");
      const a = alpha ? "a" : "";
      return `  --${prefix}-${a}${step}: ${v};`;
    })
    .join("\n");
}

function scaleBlock(mode) {
  const d = mode === "dark";
  return [
    vars(d ? slateDark : slate, "slate"),
    vars(d ? slateDarkA : slateA, "slate", true),
    vars(d ? redDark : red, "red"),
    vars(d ? redDarkA : redA, "red", true),
    vars(d ? greenDark : green, "green"),
    vars(d ? greenDarkA : greenA, "green", true),
    vars(d ? blueDark : blue, "blue"),
    vars(d ? blueDarkA : blueA, "blue", true),
    vars(d ? amberDark : amber, "amber"),
    vars(d ? amberDarkA : amberA, "amber", true),
  ].join("\n");
}

function p3Block(mode) {
  const d = mode === "dark";
  return [
    vars(d ? slateDarkP3 : slateP3, "slate"),
    vars(d ? slateDarkP3A : slateP3A, "slate", true),
  ].join("\n");
}

// ---- theme-dependent semantics ---------------------------------------------
// Contrast primary sits at the far end of the neutral scale; its hover is one
// perceptual step beyond slate-12, which Radix does not provide.

function semantics(mode) {
  const d = mode === "dark";
  // Status text is derived, not picked: step 11 walked toward step 12 until
  // it clears AA (4.5) on its own wash over the card surface (worst case).
  const surface = d ? slateDark.slate2 : slate.slate2;
  const okText = deriveText(d ? greenDark.green11 : green.green11, d ? greenDark.green12 : green.green12, d ? greenDarkA.greenA3 : greenA.greenA3, surface);
  const warnText = deriveText(d ? amberDark.amber11 : amber.amber11, d ? amberDark.amber12 : amber.amber12, d ? amberDarkA.amberA3 : amberA.amberA3, surface);
  const dangerText = deriveText(d ? redDark.red11 : red.red11, d ? redDark.red12 : red.red12, d ? redDarkA.redA3 : redA.redA3, surface);
  const infoText = deriveText(d ? blueDark.blue11 : blue.blue11, d ? blueDark.blue12 : blue.blue12, d ? blueDarkA.blueA3 : blueA.blueA3, surface);
  const surf1 = d ? slateDark.slate1 : slate.slate1;
  const chartScales = d
    ? [[blueDark.blue9, blueDark.blue11], [violetDark.violet9, violetDark.violet11], [tealDark.teal9, tealDark.teal11], [amberDark.amber9, amberDark.amber11], [crimsonDark.crimson9, crimsonDark.crimson11], [grassDark.grass9, grassDark.grass11]]
    : [[blue.blue9, blue.blue11], [violet.violet9, violet.violet11], [teal.teal9, teal.teal11], [amber.amber9, amber.amber11], [crimson.crimson9, crimson.crimson11], [grass.grass9, grass.grass11]];
  const chartVars = chartScales
    .map(([s9, s11], i) => `  --chart-${i + 1}: ${deriveChart(s9, s11, surf1)};`)
    .join("\n");
  return `  --contrast-fill: var(--slate-12);
  --contrast-fill-hover: ${d ? "#fcfcfd" : "#2b3036"};
  --contrast-fg: var(--slate-1);
${chartVars}
  --ok-text: ${okText};
  --warn-text: ${warnText};
  --danger-text: ${dangerText};
  --info-text: ${infoText};
  --shadow-overlay: ${d
    ? "0 0 0 1px var(--slate-a6), 0 8px 24px rgb(0 0 0 / 0.42), 0 2px 8px rgb(0 0 0 / 0.32)"
    : "0 0 0 1px var(--slate-a4), 0 8px 24px rgb(0 10 30 / 0.10), 0 2px 8px rgb(0 10 30 / 0.06)"};`;
}

// ---- springs as CSS linear() -----------------------------------------------
// Sampled damped-harmonic springs, Motion-style (visualDuration + bounce),
// so the common cases animate with zero JS. Fallback: --ease-out.

function springLinear(visualDuration, bounce, samples = 24) {
  const zeta = 1 - bounce;                    // damping ratio
  const w0 = (2 * Math.PI) / visualDuration;  // natural frequency
  const total = visualDuration * 1.65;        // include the settle tail
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * total;
    let x;
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      x = 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t));
    } else {
      x = 1 - Math.exp(-w0 * t) * (1 + w0 * t);
    }
    pts.push([x, (t / total) * 100]);
  }
  pts[pts.length - 1][0] = 1;
  return {
    easing: `linear(${pts.map(([x, p], i) =>
      i === 0 ? x.toFixed(4) : `${x.toFixed(4)} ${p.toFixed(1)}%`).join(", ")})`,
    duration: Math.round(total * 1000),
  };
}

const springs = {
  snap: springLinear(0.20, 0.15),
  smooth: springLinear(0.30, 0),
  sheet: springLinear(0.50, 0.05),
};

// ---- assemble ---------------------------------------------------------------

const staticTokens = `  /* ---- aliasing layer: components reference these, never slate-* ---- */
  --surface-1: var(--slate-1);          /* page */
  --surface-2: var(--slate-2);          /* card, panel, overlay */
  --border-subtle: var(--slate-a6);     /* hairline */
  --border: var(--slate-a7);            /* control border */
  --border-hover: var(--slate-a8);
  --fill-hover: var(--slate-a3);
  --fill-active: var(--slate-a4);
  --highlight: var(--slate-a5);         /* inset top edge */
  --text-primary: var(--slate-12);
  --text-secondary: var(--slate-11);
  --text-placeholder: var(--slate-9);
  --focus-ring: var(--slate-8);

  /* ---- control slots: per-variant fill/fg/edge, overridden on .btn-* and
     friends; registered here so overrides resolve to known tokens ---- */
  --_fill: transparent;
  --_fg: var(--text-primary);
  --_edge: var(--border);

  /* ---- accent slot: the entire per-app override surface ---- */
  --accent-fill: var(--contrast-fill);
  --accent-fill-hover: var(--contrast-fill-hover);
  --accent-fg: var(--contrast-fg);
  --accent-edge: var(--contrast-fill);

  /* ---- meaning colours: not overridable, always carry an icon ---- */
  --go-fill: var(--green-9);
  --go-edge: var(--green-10);
  --go-fill-hover: var(--green-10);
  --go-fg: #ffffff;
  --danger-fill: var(--red-9);
  --danger-edge: var(--red-10);
  --danger-fill-hover: var(--red-10);
  --danger-fg: #ffffff;

  /* ---- materials: named surface presets (bg / border / highlight) ---- */
  --card-bg: var(--surface-2);
  --card-border: var(--border-subtle);
  --card-highlight: inset 0 1px 0 var(--highlight);
  --overlay-bg: var(--surface-2);
  --overlay-shadow: var(--shadow-overlay);
  --well-bg: var(--fill-hover);
  --well-border: var(--border-subtle);

  /* ---- geometry ---- */
  --radius: 6.5px;
  --radius-sm: 4.5px;
  --radius-card: 9.5px;
  --radius-full: 999px;
  --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px;
  --sp-5: 24px; --sp-6: 32px; --sp-7: 48px; --sp-8: 64px;

  /* ---- vertical rhythm: line-heights in pixels, one per size band, all
     multiples of 4. A ratio puts a 13px row on 19.5px and a 15px row on
     22.5px, so nothing beneath them can land on the grid and half-pixel
     y positions draw hairlines at double weight in Safari. ---- */
  --lh-1: 16px;   /* 11 to 12px: caption, meta, hint */
  --lh-2: 20px;   /* 13 to 15px: ui, body, label, subheading */
  --lh-3: 24px;   /* 16 to 18px: heading, prose body */
  --lh-4: 28px;   /* 20 to 22px */
  --lh-5: 32px;   /* 24px and over: page title */

  /* ---- height scale: every control and every row picks from these, so
     neighbours share a bottom edge without anyone measuring ---- */
  --h-1: 24px; --h-2: 28px; --h-3: 32px; --h-4: 40px; --h-5: 48px;

  /* ---- page gutter: one token, three breakpoints (widened below) ---- */
  --gutter: var(--sp-4);

  /* ---- content columns: a page picks a measure, never a number ---- */
  --col-narrow: 480px;    /* a form, a dialog body, a sign-in */
  --col-text: 68ch;       /* reading measure, what .prose uses */
  --col-content: 720px;   /* one column of panels */
  --col-page: 980px;      /* a dashboard inside the shell */

  /* ---- density: remapped by [data-density="compact"] only ---- */
  --h-control: var(--h-3);
  --h-control-sm: var(--h-2);
  --h-control-lg: var(--h-4);
  --pad-control-x: 12px;
  --pad-control-x-sm: 10px;
  --pad-control-x-lg: 16px;
  --pad-card: 16px;
  --font-size-ui: 13px;
  --font-size-body: 14px;
  --row-h: var(--h-4);

  /* ---- motion: two curves, four durations, three springs ---- */
  --ease-out: cubic-bezier(0.2, 0, 0, 1);
  --ease-ios: cubic-bezier(0.32, 0.72, 0, 1);
  --dur-fast: 100ms;
  --dur-base: 140ms;
  --dur-slow: 200ms;
  --dur-sheet: 500ms;
${Object.entries(springs).map(([name, s]) =>
  `  --spring-${name}: ${s.easing};\n  --spring-${name}-dur: ${s.duration}ms;`).join("\n")}

  /* ---- compat aliases: token names from g-design-language, the predecessor ---- */
  --bg: var(--surface-1);
  --bg-panel: var(--surface-2);
  --bg-panel-2: var(--fill-hover);
  --text: var(--text-primary);
  --text-hot: var(--text-primary);
  --text-muted: var(--text-secondary);
  --accent: var(--accent-fill);
  --accent-on: var(--accent-fg);
  --border-strong: var(--border);
  --ok: var(--ok-text);
  --warn: var(--warn-text);
  --danger: var(--danger-text);`;

const css = `/* g-tokens: generated from @radix-ui/colors by scripts/build-tokens.mjs. Do not edit. */

/* Dark is the default, unconditionally. data-theme="light" opts a tree out;
   data-theme="system" follows the OS preference. Any element can re-assert
   a mode, so theme islands compose. */

:root {
${scaleBlock("dark")}
${semantics("dark")}
  color-scheme: dark;
}

/* Aliases live on every themed element, not just :root, because var() substitutes
   where a property is declared, so a theme island only re-maps its aliases
   if they are re-declared on it. */
:root, [data-theme] {
${staticTokens}
}

[data-theme="dark"] {
${scaleBlock("dark")}
${semantics("dark")}
  color-scheme: dark;
}

[data-theme="light"] {
${scaleBlock("light")}
${semantics("light")}
  color-scheme: light;
}

@media (prefers-color-scheme: light) {
  [data-theme="system"] {
${scaleBlock("light")}
${semantics("light")}
    color-scheme: light;
  }
}

@supports (color: color(display-p3 1 1 1)) {
  :root, [data-theme="dark"] {
${p3Block("dark")}
  }
  [data-theme="light"] {
${p3Block("light")}
  }
  @media (prefers-color-scheme: light) {
    [data-theme="system"] {
${p3Block("light")}
    }
  }
}

/* Page gutter widens with the viewport. The 720px step is the same one the
   app shell folds its sidebar at, so chrome and content move together. */
@media (min-width: 720px) {
  :root, [data-theme] { --gutter: var(--sp-5); }
}
@media (min-width: 1200px) {
  :root, [data-theme] { --gutter: var(--sp-6); }
}

/* Density: one attribute on the root, never a per-component prop. */
[data-density="compact"] {
  --h-control: var(--h-2);
  --h-control-sm: var(--h-1);
  --h-control-lg: var(--h-3);
  --pad-control-x: 10px;
  --pad-control-x-sm: 8px;
  --pad-control-x-lg: 12px;
  --pad-card: 12px;
  --font-size-ui: 12.5px;
  --font-size-body: 13px;
  --row-h: var(--h-3);
}

/* Browsers without linear() easing fall back to ease-out. */
@supports not (animation-timing-function: linear(0, 1)) {
  :root {
    --spring-snap: var(--ease-out);
    --spring-smooth: var(--ease-out);
    --spring-sheet: var(--ease-ios);
  }
}
`;

const fontsCss = `/* g-tokens fonts: Inter (UI), Space Grotesk (display, optional), JetBrains Mono. */

@font-face {
  font-family: "InterVariable";
  src: url("fonts/InterVariable.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Space Grotesk";
  src: url("fonts/SpaceGrotesk-Variable.woff2") format("woff2");
  font-weight: 300 700;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "JetBrains Mono";
  src: url("fonts/JetBrainsMono-Variable.woff2") format("woff2");
  font-weight: 100 800;
  font-style: normal;
  font-display: swap;
}
/* Metric-matched fallback: Arial adjusted to Inter's metrics so the swap
   never shifts layout. */
@font-face {
  font-family: "Inter Fallback";
  src: local("Arial");
  size-adjust: 107%;
  ascent-override: 90.44%;
  descent-override: 22.52%;
  line-gap-override: 0%;
}

:root {
  /* One-variable family swap: point --font-ui elsewhere and everything follows. */
  --font-ui: "InterVariable", "Inter Fallback", ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-ui); /* opt in to Space Grotesk per app */
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;

  /* Inter features: contextual alternates and ligatures on, optical sizing on.
     Tabular numbers are opt-in via font-variant-numeric where data aligns. */
  --font-features-ui: "calt" 1, "liga" 1, "cv05" 1, "cv11" 1;
}
`;

mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "tokens.css"), css);
writeFileSync(join(root, "dist", "fonts.css"), fontsCss);
console.log("dist/tokens.css", css.length, "bytes");
console.log("dist/fonts.css", fontsCss.length, "bytes");

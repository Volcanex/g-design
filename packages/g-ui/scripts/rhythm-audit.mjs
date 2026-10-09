/* Rhythm audit: renders a page and reports every box that misses the grid.
   Usage: node rhythm-audit.mjs <url> [--viewport 1280x800] [--theme dark|light]
                                     [--top 15] [--json] [--max N]
   Exit code is 1 when --max is given and the off-grid edge count exceeds it,
   so a consumer can run this as a gate in its own e2e suite.

   What it checks:
     1. Every box's top and bottom edge against the 4px grid, twice: once
        measured from its own container's content box, which is the number
        to work on, and once from the top of the page, which inherits every
        border above it.
     2. Half-pixel edges, counted apart. They come from ratio line-heights,
        and they are what makes Safari draw a hairline at double weight.
     3. Every vertical gap between stacked siblings against the spacing
        scale (--sp-1 to --sp-8).

   What it skips, on purpose: svg and everything inside it (icons are
   glyphs, not layout), .sr-only, inline boxes (their geometry comes from
   line boxes, not from the layout), zero-area boxes, and anything under
   [data-audit-skip]. A 1px border moves an edge by design, so no bordered
   design reaches zero on the page number; work on the container number,
   the half-pixel count and the gaps, and read the rest as a trend. */
import { chromium } from "playwright";

const GRID = 4;
const SCALE = [0, 4, 8, 12, 16, 24, 32, 48, 64];
const TOL = 0.05;

const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--"));
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
if (!url) {
  console.error("usage: node rhythm-audit.mjs <url> [--viewport 1280x800] [--theme dark|light] [--top 15] [--json] [--max N]");
  process.exit(2);
}
const [vw, vh] = String(flag("viewport", "1280x800")).split("x").map(Number);
const theme = flag("theme", "dark");
const top = Number(flag("top", 15));
const max = flag("max", null);
const asJson = args.includes("--json");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 });
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(String(e)));
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(250);

const report = await page.evaluate(({ GRID, SCALE, TOL }) => {
  const offGrid = (v) => {
    const r = Math.abs(v) % GRID;
    return Math.min(r, GRID - r) > TOL;
  };
  const halfPixel = (v) => Math.abs((Math.abs(v) % 1) - 0.5) <= TOL;
  const onScale = (v) => SCALE.some((s) => Math.abs(v - s) <= TOL);
  const sel = (el) => {
    const cls = [...el.classList].filter((c) => !c.startsWith("data-")).slice(0, 2).join(".");
    return el.tagName.toLowerCase() + (cls ? "." + cls : "");
  };

  const boxes = new Map();
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest("svg, .sr-only, [data-audit-skip]")) continue;
    if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "BR"].includes(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.display === "inline" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 0.5 || r.height < 0.5) continue;
    boxes.set(el, {
      top: r.top + scrollY, bottom: r.bottom + scrollY, left: r.left, right: r.right,
      padTop: r.top + scrollY + parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop),
    });
  }
  /* An item centred in a taller row is placed by the row, not by its author:
     its offset is (row - item) / 2 and no scale can make that a grid step.
     Those are skipped, so what is left is what someone actually chose. */
  const centred = (el) => {
    const p = el.parentElement;
    if (!p) return false;
    const ps = getComputedStyle(p);
    if (ps.display === "table-cell" || p.tagName === "TD" || p.tagName === "TH") return true;
    const es = getComputedStyle(el);
    if (es.position === "absolute" || es.position === "fixed") return true;
    if (!/flex|grid/.test(ps.display)) return false;
    const align = es.alignSelf === "auto" ? ps.alignItems : es.alignSelf;
    return align === "center" || align === "baseline" || align === "flex-end" || align === "end";
  };
  /* Local origin: the content-box top of the nearest measured ancestor. A 1px
     border moves everything nested inside it, and that is one decision, not a
     fault in every descendant, so the local number charges it once. */
  const originOf = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const b = boxes.get(p);
      if (b) return b.padTop;
    }
    return 0;
  };

  const rows = new Map();
  const bump = (k, field, sample) => {
    const row = rows.get(k) || { selector: k, local: 0, half: 0, gaps: 0, sample: "" };
    row[field]++;
    if (!row.sample) row.sample = sample;
    rows.set(k, row);
  };

  let edges = 0, local = 0, half = 0, gaps = 0, gapPairs = 0;
  for (const [el, b] of boxes) {
    const origin = originOf(el);
    const skipLocal = centred(el);
    for (const edge of ["top", "bottom"]) {
      if (offGrid(b[edge])) {
        edges++;
        const isHalf = halfPixel(b[edge]);
        if (isHalf) half++;
        if (isHalf) bump(sel(el), "half", `${edge} ${b[edge].toFixed(2)}`);
      }
      if (!skipLocal && offGrid(b[edge] - origin)) {
        local++;
        bump(sel(el), "local", `${edge} ${(b[edge] - origin).toFixed(2)} from its container`);
      }
    }
    // vertical gaps between stacked children
    const kids = [...el.children].filter((c) => boxes.has(c)).map((c) => ({ c, ...boxes.get(c) }))
      .sort((a, z) => a.top - z.top);
    for (let i = 1; i < kids.length; i++) {
      const a = kids[i - 1], z = kids[i];
      const overlapsX = Math.min(a.right, z.right) - Math.max(a.left, z.left) > 1;
      if (!overlapsX) continue;
      const gap = z.top - a.bottom;
      if (gap < 0.5) continue;
      gapPairs++;
      if (!onScale(gap)) {
        gaps++;
        bump(sel(el), "gaps", `gap ${gap.toFixed(2)} between ${sel(a.c)} and ${sel(z.c)}`);
      }
    }
  }
  return {
    boxes: boxes.size,
    edgesChecked: boxes.size * 2,
    edges, local, half, gaps, gapPairs,
    rows: [...rows.values()].sort((a, z) => (z.local + z.gaps * 2) - (a.local + a.gaps * 2)),
  };
}, { GRID, SCALE, TOL });

report.url = url;
report.viewport = `${vw}x${vh}`;
report.theme = theme;
report.consoleErrors = consoleErrors;
await browser.close();

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const pct = (n, d) => (d ? ((n / d) * 100).toFixed(1) : "0.0") + "%";
  console.log(`rhythm audit  ${url}  ${report.viewport}  ${theme}`);
  console.log(`  boxes measured        ${String(report.boxes).padStart(5)}`);
  console.log(`  off-grid in container ${String(report.local).padStart(5)}  ${pct(report.local, report.edgesChecked)} of ${report.edgesChecked} edges`);
  console.log(`  off-grid on the page  ${String(report.edges).padStart(5)}  ${pct(report.edges, report.edgesChecked)}`);
  console.log(`  half-pixel edges      ${String(report.half).padStart(5)}`);
  console.log(`  off-scale gaps        ${String(report.gaps).padStart(5)}  of ${report.gapPairs} stacked pairs`);
  if (report.rows.length) {
    console.log("");
    console.log("  " + "selector".padEnd(30) + "local  half  gaps  example");
    for (const r of report.rows.slice(0, top)) {
      console.log("  " + r.selector.slice(0, 29).padEnd(30)
        + String(r.local).padStart(5) + String(r.half).padStart(6) + String(r.gaps).padStart(6)
        + "  " + r.sample);
    }
    if (report.rows.length > top) console.log(`  ... and ${report.rows.length - top} more selectors`);
  }
  if (consoleErrors.length) {
    console.log("");
    console.log(`  console errors ${consoleErrors.length}:`);
    for (const e of consoleErrors.slice(0, 5)) console.log("    " + e);
  }
  console.log("");
  console.log(`summary: ${report.local} edges off the grid in their container, ${report.edges} off it on the page, ${report.half} on half pixels, ${report.gaps} off-scale gaps, over ${report.boxes} boxes`);
}

if (max !== null && report.local > Number(max)) {
  console.error(`FAIL: ${report.local} off-grid edges is over the ${max} allowed`);
  process.exit(1);
}

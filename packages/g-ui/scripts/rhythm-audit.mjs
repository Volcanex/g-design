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
import { measureRhythm } from "./rhythm-measure.mjs";

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

const report = await measureRhythm(page);

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

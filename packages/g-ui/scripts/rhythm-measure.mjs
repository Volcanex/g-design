/* The measuring half of the rhythm audit, shared by rhythm-audit.mjs and by any
   other check that already has a Playwright page open (the g-levels spacing
   sensor imports it, so the two never drift apart). Same rules as the audit:
   see rhythm-audit.mjs for what it checks and what it skips on purpose. */

export const GRID = 4;
export const SCALE = [0, 4, 8, 12, 16, 24, 32, 48, 64];
export const TOL = 0.05;

/* Runs inside the page. It must not close over anything: Playwright sends its
   source text, not the function. */
export const rhythmInPage = ({ GRID, SCALE, TOL }) => {
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
};

export function measureRhythm(page, opts = {}) {
  return page.evaluate(rhythmInPage, { GRID, SCALE, TOL, ...opts });
}

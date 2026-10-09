/* g.chart, dependency-free SVG charts. Every renderer takes (el, data,
   opts), sizes itself to the box, so a
   re-render is just calling it again. Colours are written as var(--chart-N)
   strings, so the theme owns the palette and a switch recolours live. */
(() => {
  const g = (window.g = window.g || {});
  const NS = "http://www.w3.org/2000/svg";
  const chart = (g.chart = g.chart || {});
  let scatterId = 0;

  const node = (name, attrs) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    return n;
  };
  const color = (n) => `var(--chart-${((Math.round(n || 1) - 1) % 6 + 6) % 6 + 1})`;
  const nums = (v) => (Array.isArray(v) ? v : []).map(Number).filter(Number.isFinite);
  const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = (v, opts) =>
    (opts && opts.format ? opts.format(v) : new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(v));

  /* A flat series draws down the middle rather than collapsing onto an edge. */
  function extent(values, opts) {
    let lo = Math.min(...values);
    let hi = Math.max(...values);
    if (opts && opts.zero) lo = Math.min(0, lo);
    if (opts && opts.min != null) lo = opts.min;
    if (opts && opts.max != null) hi = opts.max;
    if (hi === lo) { hi += 1; lo -= 1; }
    return [lo, hi];
  }

  /* Clear the host and hand back its box. Measuring after the clear is
     deliberate: a height that came from content collapses to 0 and falls
     back to the default, a height that came from CSS survives. */
  function open(host, dw, dh) {
    cancelAnimationFrame(host._gchartFrame);
    host.classList.add("g-chart");
    host.textContent = "";
    return { w: Math.max(1, host.clientWidth || dw), h: Math.max(1, host.clientHeight || dh) };
  }

  function frame(w, h) {
    return node("svg", {
      viewBox: `0 0 ${w} ${h}`,
      width: "100%",
      height: "100%",
      preserveAspectRatio: "none",
      role: "img",
    });
  }

  /* The entrance runs once per element and never on a re-render of the same
     one; interruption is safe because the flip is a single queued frame. */
  function enter(host, marked) {
    if (still() || host._gchartEntered) {
      marked.forEach((el) => { el.removeAttribute("data-draw"); el.removeAttribute("data-rise"); el.removeAttribute("data-fade"); });
      return;
    }
    host._gchartEntered = true;
    host._gchartFrame = requestAnimationFrame(() =>
      (host._gchartFrame = requestAnimationFrame(() => marked.forEach((el) => el.setAttribute("data-on", "")))));
  }

  /* Re-arm the entrance so the next render animates again. */
  chart.replay = (host) => { host._gchartEntered = false; };

  function legend(items) {
    const box = document.createElement("div");
    box.className = "g-chart-legend";
    items.forEach((it) => {
      const key = document.createElement("span");
      key.className = "g-chart-key";
      const dot = document.createElement("i");
      dot.style.background = it.color;
      key.append(dot, document.createTextNode(it.label));
      if (it.value != null) {
        const val = document.createElement("b");
        val.textContent = it.value;
        key.append(val);
      }
      box.append(key);
    });
    return box;
  }

  const path = (pts) => pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join("");

  /* ---- sparkline -------------------------------------------------------- */

  chart.sparkline = (host, values, opts = {}) => {
    values = nums(values);
    const { w, h } = open(host, 120, 28);
    if (!values.length) return;

    const c = color(opts.color);
    const pad = 4;
    const [lo, hi] = extent(values, opts);
    const x = (i) => (values.length === 1 ? w / 2 : pad + (i * (w - pad * 2)) / (values.length - 1));
    const y = (v) => h - pad - ((v - lo) / (hi - lo)) * (h - pad * 2);
    const pts = values.map((v, i) => [x(i), y(v)]);

    const svg = frame(w, h);
    svg.append(node("path", {
      d: `${path(pts)}L${x(values.length - 1).toFixed(2)},${h}L${x(0).toFixed(2)},${h}Z`,
      fill: c,
      "fill-opacity": opts.fillOpacity ?? 0.08,
      stroke: "none",
      "data-fade": "",
    }));
    svg.append(node("path", {
      d: path(pts),
      fill: "none",
      stroke: c,
      "stroke-width": 1.5,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      pathLength: 1,
      "data-draw": "",
    }));
    svg.append(node("circle", {
      cx: x(values.length - 1), cy: y(values[values.length - 1]), r: 2.5, fill: c, "data-fade": "",
    }));
    host.append(svg);
    enter(host, [...svg.children]);
  };

  /* ---- line ------------------------------------------------------------- */

  chart.line = (host, data = {}, opts = {}) => {
    const series = (data.series || []).slice(0, 6)
      .map((s, i) => ({ label: s.label || `Series ${i + 1}`, values: nums(s.values), color: color(s.color ?? i + 1) }))
      .filter((s) => s.values.length);
    const labels = data.labels || [];
    const showLegend = opts.legend !== false && series.length > 1;

    const { w, h } = open(host, 520, 200);
    if (!series.length) return;

    const keys = showLegend ? legend(series.map((s) => ({ label: s.label, color: s.color }))) : null;
    if (keys) host.append(keys);
    const hSvg = Math.max(40, h - (keys ? keys.offsetHeight + 8 : 0));

    const padL = opts.padLeft ?? 38;
    const padR = 12;
    const padT = 10;
    const padB = labels.length ? 20 : 8;
    const y0 = hSvg - padB;
    const all = series.flatMap((s) => s.values);
    const [lo, hi] = extent(all, opts);
    const n = Math.max(...series.map((s) => s.values.length));
    const x = (i) => (n === 1 ? (padL + w - padR) / 2 : padL + (i * (w - padL - padR)) / (n - 1));
    const y = (v) => y0 - ((v - lo) / (hi - lo)) * (y0 - padT);

    const svg = frame(w, hSvg);
    svg.append(node("line", { x1: padL, y1: y0, x2: w - padR, y2: y0, stroke: "var(--border-subtle)", "stroke-width": 1 }));

    [[hi, y(hi)], [lo, y(lo)]].forEach(([v, at]) => {
      const t = node("text", { x: padL - 8, y: at + 3.5, "text-anchor": "end", class: "num" });
      t.textContent = fmt(v, opts);
      svg.append(t);
    });

    if (labels.length) {
      [[labels[0], x(0), "start"], [labels[Math.min(labels.length, n) - 1], x(n - 1), "end"]].forEach(([label, at, anchor]) => {
        const t = node("text", { x: at, y: y0 + 14, "text-anchor": anchor });
        t.textContent = label;
        svg.append(t);
      });
    }

    const drawn = [];
    series.forEach((s, i) => {
      const pts = s.values.map((v, j) => [x(j), y(v)]);
      const line = node("path", {
        d: path(pts),
        fill: "none",
        stroke: s.color,
        "stroke-width": 1.5,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        pathLength: 1,
        "data-draw": "",
      });
      line.style.transitionDelay = `${i * 40}ms`;
      const last = pts[pts.length - 1];
      const dot = node("circle", { cx: last[0], cy: last[1], r: 2.5, fill: s.color, "data-fade": "" });
      dot.style.transitionDelay = `${i * 40 + 120}ms`;
      svg.append(line, dot);
      drawn.push(line, dot);
    });

    host.prepend(svg);
    enter(host, drawn);
  };

  /* ---- bar -------------------------------------------------------------- */

  /* Rounded top only: a rect with rx would round the feet into the baseline. */
  function barPath(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h));
    return `M${x},${y + h}V${y + r}a${r},${r} 0 0 1 ${r},${-r}h${w - r * 2}a${r},${r} 0 0 1 ${r},${r}V${y + h}Z`;
  }

  chart.bar = (host, data = {}, opts = {}) => {
    const values = nums(data.values);
    const labels = data.labels || [];
    const { w, h } = open(host, 520, 200);
    if (!values.length) return;

    const c = color(opts.color);
    const padT = opts.values ? 18 : 10;
    const padB = labels.length ? 20 : 8;
    const padX = 2;
    const y0 = h - padB;
    const [lo, hi] = extent(values, { ...opts, zero: opts.zero !== false });
    const band = (w - padX * 2) / values.length;
    const bw = Math.max(3, band * (opts.barWidth ?? 0.62));
    const y = (v) => y0 - ((v - lo) / (hi - lo)) * (y0 - padT);

    const svg = frame(w, h);
    const risen = [];
    values.forEach((v, i) => {
      const cx = padX + band * i + band / 2;
      const top = y(v);
      const bar = node("path", {
        d: barPath(cx - bw / 2, top, bw, Math.max(1, y0 - top), 2),
        fill: c,
        "data-rise": "",
      });
      bar.style.transformOrigin = `${cx}px ${y0}px`;
      bar.style.transitionDelay = `${i * 20}ms`;
      svg.append(bar);
      risen.push(bar);

      if (opts.values) {
        const t = node("text", { x: cx, y: top - 6, "text-anchor": "middle", class: "num" });
        t.textContent = fmt(v, opts);
        svg.append(t);
      }
      if (labels[i] != null) {
        const t = node("text", { x: cx, y: y0 + 14, "text-anchor": "middle" });
        t.textContent = labels[i];
        svg.append(t);
      }
    });
    svg.append(node("line", { x1: padX, y1: y0, x2: w - padX, y2: y0, stroke: "var(--border-subtle)", "stroke-width": 1 }));

    host.append(svg);
    enter(host, risen);
  };

  /* ---- donut ------------------------------------------------------------ */

  chart.donut = (host, data = [], opts = {}) => {
    const slices = (data || [])
      .map((d, i) => ({ label: d.label || `Slice ${i + 1}`, value: Number(d.value) || 0, color: color(d.color ?? i + 1) }))
      .filter((d) => d.value > 0)
      .slice(0, 6);
    const side = opts.legend === "side";

    const { w, h } = open(host, 240, 190);
    host.toggleAttribute("data-layout", false);
    if (side) host.setAttribute("data-layout", "side");
    if (!slices.length) return;

    const total = slices.reduce((a, d) => a + d.value, 0);
    const keys = opts.legend === false ? null : legend(slices.map((d) => ({
      label: d.label,
      color: d.color,
      value: opts.legendValues === false ? null : fmt(d.value, opts),
    })));
    if (keys) host.append(keys);

    const wSvg = side && keys ? Math.max(60, w - keys.offsetWidth - 16) : w;
    const hSvg = !side && keys ? Math.max(60, h - keys.offsetHeight - 8) : h;
    const size = Math.min(wSvg, hSvg);
    const thick = size * 0.14;
    const r = (size - thick) / 2;
    const C = 2 * Math.PI * r;
    const gap = Math.min(2, C / (slices.length * 3));
    const cx = wSvg / 2;
    const cy = hSvg / 2;

    const svg = frame(wSvg, hSvg);
    const ring = node("g", { transform: `rotate(-90 ${cx} ${cy})` });
    let at = 0;
    slices.forEach((d) => {
      const len = (d.value / total) * C;
      const dash = Math.max(0.5, len - gap);
      ring.append(node("circle", {
        cx, cy, r,
        fill: "none",
        stroke: d.color,
        "stroke-width": thick,
        "stroke-dasharray": `${dash.toFixed(2)} ${(C - dash).toFixed(2)}`,
        "stroke-dashoffset": (-(at + gap / 2)).toFixed(2),
      }));
      at += len;
    });
    svg.append(ring);

    const centre = node("text", {
      x: cx, y: cy, "text-anchor": "middle",
      "dominant-baseline": "middle",
      class: "center-value num",
      "font-size": Math.max(13, Math.round(size * 0.16)),
    });
    centre.textContent = opts.center ?? fmt(total, opts);
    svg.append(centre);
    if (opts.caption) {
      const cap = node("text", { x: cx, y: cy + Math.round(size * 0.13) + 6, "text-anchor": "middle", "dominant-baseline": "middle" });
      cap.textContent = opts.caption;
      svg.append(cap);
    }

    host.prepend(svg);
  };

  /* ---- scatter ---------------------------------------------------------- */

  /* Points on two measured axes, for trade-offs such as cost against score.
     opts.frontier draws the Pareto edge (lowest x for the highest y; flip
     with opts.frontier = "max-x"), opts.xLog suits costs spanning decades.
     A point with active: true is ringed; r scales its radius (0.6 to 2.5);
     hollow: true draws it as a dim outline, for a point that is out of play.
     Stable ids or labels keep points in place between calls. No fades.
     opts.lines draws clipped data-space lines on linear axes under points.
     A line pivots on its through point, so a line through a point glides
     with it instead of jumping (every engine, not only those that animate d).
     opts.xMin / opts.xMax fix the x domain; a point past it sits on the edge
     and its tip keeps the real value. Each point carries data-tip.
     opts.labels = "edge" names only frontier and active points, for dense plots. */
  chart.scatter = (host, data = {}, opts = {}) => {
    const pts = (data.points || [])
      .map((p) => {
        const r = Number(p.r ?? 1);
        return { ...p, x: Number(p.x), y: Number(p.y), r: Number.isNaN(r) ? 1 : Math.max(0.6, Math.min(2.5, r)), c: color(p.color ?? 1) };
      })
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && (!opts.xLog || p.x > 0));
    let state = host._gchartScatter;
    if (state && state.svg.parentNode !== host) state = null;
    if (!pts.length) { open(host, 520, 240); host._gchartScatter = null; return; }
    const { w, h } = state
      ? { w: Math.max(1, host.clientWidth || 520), h: Math.max(1, host.clientHeight || 240) }
      : open(host, 520, 240);
    if (state && state.keys) state.keys.remove();

    const groups = [];
    pts.forEach((p) => { if (p.group && !groups.some((g) => g.label === p.group)) groups.push({ label: p.group, color: p.c }); });
    const keys = opts.legend !== false && groups.length > 1 ? legend(groups) : null;
    if (keys) host.append(keys);
    const hSvg = Math.max(60, h - (keys ? keys.offsetHeight + 8 : 0));

    const padL = opts.padLeft ?? 38;
    const padR = opts.padRight ?? 56;
    const padT = 12;
    const padB = 34;
    const y0 = hSvg - padB;
    const tx = (v) => (opts.xLog ? Math.log10(v) : v);
    const xin = (v) => Math.min(opts.xMax ?? Infinity, Math.max(opts.xMin ?? -Infinity, v));
    let [xlo, xhi] = extent(pts.map((p) => tx(xin(p.x))), {});
    const xs = (xhi - xlo) * 0.06;
    xlo -= xs; xhi += xs;
    let [ylo, yhi] = extent(pts.map((p) => p.y), { min: opts.yMin, max: opts.yMax });
    if (opts.yMin == null) ylo -= (yhi - ylo) * 0.08;
    if (opts.yMax == null) yhi += (yhi - ylo) * 0.08;
    const x = (v) => padL + ((tx(xin(v)) - xlo) / (xhi - xlo)) * (w - padL - padR);
    const y = (v) => y0 - ((v - ylo) / (yhi - ylo)) * (y0 - padT);
    const fx = (v) => (opts.xFormat ? opts.xFormat(v) : fmt(v, {}));
    const fy = (v) => (opts.yFormat ? opts.yFormat(v) : fmt(v, {}));

    if (!state) {
      const svg = frame(w, hSvg);
      const axes = node("g", {});
      const clip = node("clipPath", { id: `g-scatter-${++scatterId}` });
      const rect = node("rect", {});
      clip.append(rect);
      const defs = node("defs", {});
      defs.append(clip);
      const overlays = node("g", { "clip-path": `url(#${clip.id})` });
      const frontier = node("path", {
        fill: "none", stroke: "var(--text-placeholder)", "stroke-width": 1,
        "stroke-dasharray": "3 3", "data-scatter-frontier": "",
      });
      const points = node("g", {});
      svg.append(defs, axes, overlays, frontier, points);
      state = host._gchartScatter = { svg, axes, rect, overlays, frontier, points, dots: new Map(), lines: new Map() };
      host.prepend(svg);
      const emit = (id) => host.dispatchEvent(new CustomEvent("g-chart:focus", { bubbles: true, detail: { id } }));
      points.addEventListener("pointerover", (e) => { const p = e.target.closest("[data-scatter-point]"); if (p) emit(p.dataset.id); });
      points.addEventListener("pointerout", (e) => { if (!e.relatedTarget || !points.contains(e.relatedTarget)) emit(null); });
    }
    state.keys = keys;
    const { svg, axes } = state;
    svg.setAttribute("viewBox", `0 0 ${w} ${hSvg}`);
    const set = (el, attrs) => {
      for (const k in attrs) {
        if (attrs[k] == null) el.removeAttribute(k);
        else el.setAttribute(k, attrs[k]);
      }
    };
    set(state.rect, { x: padL, y: padT, width: Math.max(0, w - padL - padR), height: Math.max(0, y0 - padT) });
    axes.textContent = "";
    axes.append(node("line", { x1: padL, y1: y0, x2: w - padR, y2: y0, stroke: "var(--border-subtle)", "stroke-width": 1 }));
    axes.append(node("line", { x1: padL, y1: padT, x2: padL, y2: y0, stroke: "var(--border-subtle)", "stroke-width": 1 }));
    const unx = (t) => (opts.xLog ? 10 ** t : t);
    [[unx(xlo + xs), "start"], [unx(xhi - xs), "end"]].forEach(([v, anchor]) => {
      const t = node("text", { x: x(v), y: y0 + 14, "text-anchor": anchor, class: "num" });
      t.textContent = fx(v);
      axes.append(t);
    });
    [yhi, ylo].forEach((v) => {
      const t = node("text", { x: padL - 8, y: y(v) + 3.5, "text-anchor": "end", class: "num" });
      t.textContent = fy(Math.round(v));
      axes.append(t);
    });
    if (opts.xLabel) {
      const t = node("text", { x: (padL + w - padR) / 2, y: y0 + 28, "text-anchor": "middle" });
      t.textContent = opts.xLabel;
      axes.append(t);
    }
    if (opts.yLabel) {
      const t = node("text", { x: padL + 6, y: padT + 4, "text-anchor": "start" });
      t.textContent = opts.yLabel;
      axes.append(t);
    }

    const lines = new Map();
    if (!opts.xLog) (opts.lines || []).forEach((line, i) => {
      const slope = Number(line.slope);
      const px = Number(line.through?.x);
      const py = Number(line.through?.y);
      if (![slope, px, py].every(Number.isFinite)) return;
      let left = xlo;
      let right = xhi;
      if (slope === 0) {
        if (py < ylo || py > yhi) return;
      } else {
        const a = px + (ylo - py) / slope;
        const b = px + (yhi - py) / slope;
        left = Math.max(left, Math.min(a, b));
        right = Math.min(right, Math.max(a, b));
        if (left > right) return;
      }
      const key = line.label ?? i;
      let overlay = state.lines.get(key);
      if (!overlay) {
        overlay = node("g", {});
        const pivot = node("g", { "data-scatter-pivot": "" });
        pivot.append(node("path", { fill: "none", "stroke-width": 1, "data-scatter-line": "" }));
        overlay.append(pivot, node("text", { "text-anchor": "end", "data-scatter-line-label": "" }));
        state.overlays.append(overlay);
      }
      const [pivot, label] = overlay.children;
      const ends = [left, right].map((v) => [x(v), y(py + slope * (v - px))]);
      /* A fixed-length segment turned about the through point: translate and
         rotate spring like the points do, so the line never leaves it. The
         angle takes whichever half-turn is nearer the last one. */
      const [cx, cy] = [x(px), y(py)];
      let angle = (Math.atan(-slope * ((y0 - padT) / (yhi - ylo)) / ((w - padL - padR) / (xhi - xlo))) * 180) / Math.PI;
      if (overlay._angle != null) angle += 180 * Math.round((overlay._angle - angle) / 180);
      overlay._angle = angle;
      const reach = Math.ceil(Math.hypot(Math.max(cx, w - cx), Math.max(cy, hSvg - cy)) / 64 + 1) * 64;
      if (overlay._reach !== reach) { overlay._reach = reach; set(pivot.firstChild, { d: `M${-reach},0L${reach},0` }); }
      set(pivot.firstChild, { stroke: line.active ? "var(--accent-edge)" : "var(--border)" });
      pivot.style.translate = `${cx}px ${cy}px`;
      pivot.style.rotate = `${angle}deg`;
      label.style.translate = `${ends[1][0] - 4}px ${Math.max(padT + 12, Math.min(y0 - 4, ends[1][1] - 6))}px`;
      label.textContent = g.plain(line.label);
      label.setAttribute("text-anchor", ends[1][0] + label.getComputedTextLength() <= w - padR ? "start" : "end");
      label.style.fill = line.active ? "var(--accent-edge)" : "var(--text-placeholder)";
      lines.set(key, overlay);
    });
    state.lines.forEach((el, key) => { if (!lines.has(key)) el.remove(); });
    state.lines = lines;

    state.frontier.style.display = "none";
    if (opts.frontier) {
      const flip = opts.frontier === "max-x";
      const sorted = [...pts].sort((a, b) => (flip ? b.x - a.x : a.x - b.x) || b.y - a.y);
      const edge = [];
      sorted.forEach((p) => { if (!edge.length || p.y > edge[edge.length - 1].y) edge.push(p); });
      if (edge.length > 1) {
        state.frontier.setAttribute("d", path(edge.map((p) => [x(p.x), y(p.y)])));
        state.frontier.style.display = "";
      }
      edge.forEach((p) => { p.onEdge = true; });
    }

    const dots = new Map();
    pts.forEach((p, i) => {
      const key = p.id ?? p.label ?? i;
      let g2 = state.dots.get(key);
      if (!g2) {
        g2 = node("g", { "data-scatter-point": "" });
        g2.append(node("circle", { fill: "none", "stroke-width": 1.5 }),
          node("circle", {}), node("circle", { fill: "transparent" }),
          node("text", { y: 3.5, "text-anchor": "start" }));
        state.points.append(g2);
      }
      const [ring, dot, hit, label] = g2.children;
      const radius = (p.onEdge || !opts.frontier ? 4 : 3) * p.r;
      g2.style.translate = `${x(p.x)}px ${y(p.y)}px`;
      g2.dataset.id = key;
      g2.setAttribute("data-tip", g.plain(p.tip || `${p.label || ""} ${fx(p.x)}, ${fy(p.y)}`.trim()));
      set(ring, { r: 8 * p.r, stroke: p.c, display: p.active ? null : "none" });
      set(dot, p.hollow
        ? { r: radius, fill: "none", stroke: p.c, "stroke-width": 1.25, "stroke-opacity": 0.6, "fill-opacity": null }
        : { r: radius, fill: p.c, stroke: null, "stroke-width": null, "stroke-opacity": null, "fill-opacity": p.onEdge || !opts.frontier ? 1 : 0.45 });
      g2.toggleAttribute("data-hollow", !!p.hollow);
      set(hit, { r: Math.max(10, 10 * p.r) });
      set(label, { x: Math.max(7, radius + 3) });
      label.textContent = p.label && opts.labels !== false && (opts.labels !== "edge" || p.onEdge || p.active) ? g.plain(p.label) : "";
      label.style.fill = p.active ? "var(--text-primary)" : "";
      dots.set(key, g2);
    });
    state.dots.forEach((el, key) => { if (!dots.has(key)) el.remove(); });
    state.dots = dots;
  };

  /* ---- breakdown --------------------------------------------------------
     A score taken apart, one row per candidate on a shared axis. Each part
     walks on from where the last one stopped: gains run right on the upper
     lane, costs run back left on the hatched lower lane, and the row lands on
     its total. A guide marks one row's total through every row, so the gap
     to it reads as a length. Rows are retained by id and glide on update. */

  chart.breakdown = (host, data = {}, opts = {}) => {
    const keys = data.keys || [];
    const rows = (data.rows || []).map((r) => {
      let at = 0;
      const segs = keys.map((k) => {
        const part = (r.parts || []).find((p) => p.key === k.key);
        const v = (Number(part && part.value) || 0) * (k.sign ?? 1);
        const seg = { key: k.key, from: at, to: at + v, color: color(k.color ?? 1), label: k.label, value: v };
        at += v;
        return seg;
      });
      return { ...r, segs, end: r.total ?? at };
    });
    let state = host._gchartBreakdown;
    if (state && state.box.parentNode !== host) state = null;
    if (!state) {
      cancelAnimationFrame(host._gchartFrame);
      host.classList.add("g-chart", "g-breakdown");
      host.textContent = "";
      const box = document.createElement("div");
      box.className = "g-breakdown-rows";
      state = host._gchartBreakdown = { box, rows: new Map(), keys: null };
      host.append(box);
      const emit = (id) => host.dispatchEvent(new CustomEvent("g-chart:focus", { bubbles: true, detail: { id } }));
      box.addEventListener("pointerover", (e) => { const r = e.target.closest("[data-breakdown-row]"); if (r) emit(r.dataset.id); });
      box.addEventListener("pointerleave", () => emit(null));
      box.addEventListener("focusin", (e) => { const r = e.target.closest("[data-breakdown-row]"); if (r) emit(r.dataset.id); });
      box.addEventListener("focusout", (e) => { if (!box.contains(e.relatedTarget)) emit(null); });
    }
    if (!rows.length) { state.box.textContent = ""; state.rows.clear(); return; }
    if (state.keys) state.keys.remove();
    state.keys = opts.legend === false ? null : legend(keys.map((k) => ({ label: k.label, color: color(k.color ?? 1) })));
    if (state.keys) {
      [...state.keys.children].forEach((el, i) => {
        if ((keys[i].sign ?? 1) >= 0) return;
        el.setAttribute("data-cost", "");
        el.firstChild.style.background = `repeating-linear-gradient(135deg, ${color(keys[i].color ?? 1)} 0 1px, transparent 1px 2.5px)`;
      });
      host.prepend(state.keys);
    }

    const ends = rows.flatMap((r) => r.segs.flatMap((s) => [s.from, s.to]).concat(r.end));
    let lo = Math.min(0, ...ends, opts.min ?? 0);
    let hi = Math.max(...ends, opts.max ?? -Infinity);
    if (hi === lo) hi = lo + 1;
    const pct = (v) => `${(((v - lo) / (hi - lo)) * 100).toFixed(3)}%`;
    const span = (a, b) => `${((Math.abs(b - a) / (hi - lo)) * 100).toFixed(3)}%`;
    const guide = rows.find((r) => r.id === opts.guide);
    const f = (v) => fmt(v, opts);
    const kids = new Map();
    const fresh = [];
    rows.forEach((r) => {
      let el = state.rows.get(r.id);
      if (!el) {
        el = document.createElement("div");
        el.setAttribute("data-breakdown-row", "");
        el.tabIndex = 0;
        el.innerHTML = '<div class="g-breakdown-head"><span class="g-breakdown-label"></span><span class="g-breakdown-badge"></span><span class="g-breakdown-total num"></span></div>'
          + '<div class="g-breakdown-track" data-reveal><i class="g-breakdown-zero"></i><i class="g-breakdown-gap"></i><i class="g-breakdown-guide"></i><i class="g-breakdown-mark"></i></div>'
          + '<p class="g-breakdown-note"></p>';
        fresh.push(el.querySelector(".g-breakdown-track"));
      }
      el.dataset.id = r.id;
      el.toggleAttribute("data-active", !!r.active);
      el.toggleAttribute("data-hollow", !!r.hollow);
      const [head, track, note] = el.children;
      head.children[0].textContent = g.plain(r.label || r.id);
      const badge = head.children[1];
      badge.textContent = r.badge ? g.plain(r.badge) : "";
      badge.className = `g-breakdown-badge${r.badge ? ` badge ${r.badgeKind ? `badge-${r.badgeKind}` : "badge-plain"}` : ""}`;
      head.children[2].textContent = f(r.end);
      note.textContent = r.note ? g.plain(r.note) : "";
      const marks = new Map([...track.querySelectorAll("[data-key]")].map((s) => [s.dataset.key, s]));
      r.segs.forEach((s) => {
        let seg = marks.get(s.key);
        if (!seg) {
          seg = document.createElement("i");
          seg.className = "g-breakdown-seg";
          seg.dataset.key = s.key;
          track.insertBefore(seg, track.querySelector(".g-breakdown-gap"));
        }
        marks.delete(s.key);
        seg.toggleAttribute("data-cost", s.value < 0);
        seg.style.left = pct(Math.min(s.from, s.to));
        seg.style.width = span(s.from, s.to);
        seg.style.setProperty("--seg", s.color);
        seg.setAttribute("data-tip", `${s.label} ${s.value < 0 ? "" : "+"}${f(s.value)}`);
      });
      marks.forEach((m) => m.remove());
      const [zero, gap, line, mark] = track.querySelectorAll(".g-breakdown-zero, .g-breakdown-gap, .g-breakdown-guide, .g-breakdown-mark");
      zero.style.left = pct(0);
      mark.style.left = pct(r.end);
      line.style.left = pct(guide ? guide.end : r.end);
      line.hidden = !guide;
      const showGap = guide && guide.id !== r.id;
      gap.style.left = pct(showGap ? Math.min(r.end, guide.end) : r.end);
      gap.style.width = showGap ? span(r.end, guide.end) : "0%";
      if (showGap) gap.setAttribute("data-tip", `${f(Math.abs(guide.end - r.end))} ${r.end < guide.end ? "behind" : "ahead of"} ${g.plain(guide.label || guide.id)}`);
      else gap.removeAttribute("data-tip");
      kids.set(r.id, el);
    });
    state.rows.forEach((el, id) => { if (!kids.has(id)) el.remove(); });
    [...kids.values()].forEach((el) => state.box.append(el));
    state.rows = kids;
    if (state.focus) chart.focus(host, state.focus);
    if (still() || host._gchartEntered) fresh.forEach((t) => t.removeAttribute("data-reveal"));
    else {
      host._gchartEntered = true;
      host._gchartFrame = requestAnimationFrame(() =>
        (host._gchartFrame = requestAnimationFrame(() => fresh.forEach((t) => t.setAttribute("data-on", "")))));
    }
  };

  /* Mark one id in a breakdown or a scatter, or clear it with null. Both
     charts announce their own hover as a bubbling g-chart:focus event with
     detail.id, so two charts of the same ids can follow each other. */
  chart.focus = (host, id) => {
    const b = host._gchartBreakdown;
    if (b) {
      b.focus = id;
      b.rows.forEach((el, key) => el.toggleAttribute("data-focus", id != null && key === id));
    }
    const s = host._gchartScatter;
    if (s) s.dots.forEach((el, key) => el.toggleAttribute("data-focus", id != null && key === id));
  };

  /* ---- declarative sparklines ------------------------------------------- */

  g.use((root) => {
    root.querySelectorAll(".g-spark").forEach((el) => {
      if (el.hasAttribute("data-init")) return;
      el.setAttribute("data-init", "");
      const values = nums((el.getAttribute("data-values") || "").split(","));
      if (values.length) chart.sparkline(el, values, { color: Number(el.getAttribute("data-color")) || 1 });
    });
  });
})();

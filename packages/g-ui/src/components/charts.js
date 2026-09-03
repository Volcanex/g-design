/* g.chart, dependency-free SVG charts. Every renderer takes (el, data,
   opts), replaces the element's content and sizes itself to the box, so a
   re-render is just calling it again. Colours are written as var(--chart-N)
   strings, so the theme owns the palette and a switch recolours live. */
(() => {
  const g = (window.g = window.g || {});
  const NS = "http://www.w3.org/2000/svg";
  const chart = (g.chart = g.chart || {});

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

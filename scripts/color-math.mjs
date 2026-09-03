// Shared colour math for the token build and the contrast checker.

export function parse(c) {
  if (c.startsWith("#")) {
    const n = c.slice(1);
    const s = n.length === 3 ? [...n].map((x) => x + x).join("") : n;
    const v = s.match(/../g);
    const [r, g, b, a] = v.map((h) => parseInt(h, 16));
    return [r, g, b, a === undefined ? 1 : a / 255];
  }
  const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
}

export const hex = ([r, g, b]) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

export function over(fg, bg) {
  const [r, g, b, a] = parse(fg);
  const [br, bgc, bb] = parse(bg);
  return [r * a + br * (1 - a), g * a + bgc * (1 - a), b * a + bb * (1 - a)];
}

export function lum([r, g, b]) {
  const f = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function ratio(fg, bg) {
  const l1 = lum(Array.isArray(fg) ? fg : parse(fg).slice(0, 3));
  const l2 = lum(Array.isArray(bg) ? bg : parse(bg).slice(0, 3));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function mix(a, b, t) {
  const pa = parse(a), pb = parse(b);
  return [0, 1, 2].map((i) => pa[i] * (1 - t) + pb[i] * t);
}

// Badge text: start at step 11 and walk toward step 12 until the colour
// clears `min` against its own alpha wash composited over the card surface.
export function deriveText(step11, step12, washA3, surface, min = 4.5) {
  const bg = over(washA3, surface);
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const c = mix(step11, step12, t);
    if (ratio(c, bg) >= min) return hex(c);
  }
  return step12;
}

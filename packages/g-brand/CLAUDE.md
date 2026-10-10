# g-brand

The g mark, the one logo every G-System surface shows.

- `mark.svg`: the bare glyph, `fill="currentColor"`, cropped to the glyph. Use
  it inline or as a CSS mask so it takes the surrounding text colour.
- `icon.svg`: the app icon, the mark on a dark rounded square (1024, rx 225).
  Favicons and desktop app icons are rendered from it.

Geometry: ring centred at 512, radii 348 and 236, opened 30 degrees each side
of the horizontal; bar from x 512 to 860, y 456 to 568. The 30 degree opening
is what leaves room between the bar and the ring ends (it was 20, and the bar
crowded them).

No build step: `scripts/vendor.mjs` copies this folder to `<target>/brand/`.
Edit here, re-vendor, never edit a consumer copy.

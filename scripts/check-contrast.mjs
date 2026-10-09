// AA contrast verification, by script rather than by eye. Runs in the build.
// Two tiers: 4.5 for text (WCAG AA normal text), 3.0 for the solid action
// fills (13px/450 functional labels that also carry a mandatory icon;
// documented decision, see the buttons card). Status text is checked on its
// own wash composited over the card surface, the worst case it sits on.
import {
  slate, slateDark, slateA, slateDarkA,
  red, redDark, redA, redDarkA,
  green, greenDark, greenA, greenDarkA,
  blue, blueDark, blueA, blueDarkA,
  amber, amberDark, amberA, amberDarkA,
} from "@radix-ui/colors";
import { over, ratio, deriveText } from "./color-math.mjs";

let failed = 0;
function check(theme, name, fg, bg, min) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${theme}  ${name.padEnd(36)} ${r.toFixed(2)}:1  (needs ${min})`);
}

for (const [theme, s, rd, gn, bl, am, rdA, gnA, blA, amA] of [
  ["light", slate, red, green, blue, amber, redA, greenA, blueA, amberA],
  ["dark ", slateDark, redDark, greenDark, blueDark, amberDark, redDarkA, greenDarkA, blueDarkA, amberDarkA],
]) {
  const surf1 = s.slate1, surf2 = s.slate2;
  check(theme, "text-primary on surface-1", s.slate12, surf1, 4.5);
  check(theme, "text-primary on surface-2", s.slate12, surf2, 4.5);
  check(theme, "text-secondary on surface-1", s.slate11, surf1, 4.5);
  check(theme, "text-secondary on surface-2", s.slate11, surf2, 4.5);
  check(theme, "placeholder on surface-1", s.slate9, surf1, 3.0);
  check(theme, "contrast-fg on contrast-fill", surf1, s.slate12, 4.5);
  check(theme, "go label on green-9", "#ffffff", gn.green9, 3.0);
  check(theme, "danger label on red-9", "#ffffff", rd.red9, 3.0);

  // Derived status text, exactly as the token build derives it.
  for (const [name, s11, s12, a3] of [
    ["ok-text", gn.green11, gn.green12, gnA.greenA3],
    ["danger-text", rd.red11, rd.red12, rdA.redA3],
    ["info-text", bl.blue11, bl.blue12, blA.blueA3],
    ["amber warn-text", am.amber11, am.amber12, amA.amberA3],
  ]) {
    const derived = deriveText(s11, s12, a3, surf2);
    check(theme, `${name} on its wash over surface-2`, derived, over(a3, surf2), 4.5);
    check(theme, `${name} on surface-1`, derived, surf1, 4.5);
  }
}

if (failed) {
  console.error(`\n${failed} contrast check(s) failed`);
  process.exit(1);
}
console.log("\nall contrast checks pass");

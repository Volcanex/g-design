// Full build: tokens from @radix-ui/colors, contrast and lint gates, docs
// assets, Tailwind proof, NumberFlow vendor, React lab, shadcn registry.
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: "inherit" });

// 1. Tokens and icons, then the two gates: AA contrast and the greys lint rule.
run("node packages/g-tokens/scripts/build-tokens.mjs");
run("node packages/g-icons/scripts/build-icons.mjs");
run("node scripts/check-contrast.mjs");
run('npx stylelint "packages/g-ui/src/*.css" "packages/g-ui/src/admin/*.css" "apps/docs/**/*.card.html" "apps/docs/ui_kits/**/*.html"');

// 2. Self-contained asset sets: dist/ (one-link-tag path) and the docs app.
const tokens = readFileSync(join(root, "packages/g-tokens/dist/tokens.css"), "utf8");
const fonts = readFileSync(join(root, "packages/g-tokens/dist/fonts.css"), "utf8");
const ui = readFileSync(join(root, "packages/g-ui/src/g-ui.css"), "utf8");
const iconsJs = readFileSync(join(root, "packages/g-icons/dist/g-icons.js"), "utf8");
const uiJs = readFileSync(join(root, "packages/g-ui/src/g-ui.js"), "utf8");

// component fragments: self-contained css/js pairs, concatenated in
const fragDir = join(root, "packages/g-ui/src/components");
const frags = (ext) => readdirSync(fragDir).filter((f) => f.endsWith(ext)).sort()
  .map((f) => readFileSync(join(fragDir, f), "utf8")).join("\n");

// Fonts ship subsetted: latin + latin-ext (keeps aeoe and the Nordic set),
// punctuation, arrows and the command glyph; cv05/cv11/tnum retained.
// Originals stay untouched in packages/g-tokens/fonts/. OFL.txt rides along
// into every font folder below, because the licence requires its text to
// travel with each copy of the fonts.
const subsetDir = join(root, "packages/g-tokens/dist/fonts");
mkdirSync(subsetDir, { recursive: true });
const UNICODES = "U+0020-007E,U+00A0-00FF,U+0100-017F,U+2013-2026,U+20AC,U+2212,U+2318,U+2190-2199";
for (const f of readdirSync(join(root, "packages/g-tokens/fonts")).filter((f) => f.endsWith(".woff2"))) {
  run(`pyftsubset "packages/g-tokens/fonts/${f}" --output-file="packages/g-tokens/dist/fonts/${f}" --flavor=woff2 --unicodes="${UNICODES}" --layout-features+=cv05,cv11,tnum 2>/dev/null`);
}
cpSync(join(root, "packages/g-tokens/fonts/OFL.txt"), join(subsetDir, "OFL.txt"));

// The g-admin overlay is a SEPARATE pair of files, never concatenated into
// the public bundle: only its activation stub (components/admin-stub.js) ships
// in g-ui.js. Its CSS carries the whole design system re-scoped from :root to
// :host, because it renders inside a shadow root on pages that may never have
// loaded g.css, and generating the token layer rather than restating it is
// what keeps the overlay's greys from drifting off the scale.
const adminDir = join(root, "packages/g-ui/src/admin");
const adminSrc = (ext) => readdirSync(adminDir).filter((f) => f.endsWith(ext)).sort()
  .map((f) => readFileSync(join(adminDir, f), "utf8")).join("\n");
const scopeToHost = (css) => css
  .replace(/\[data-theme="(\w+)"\]/g, ':host([data-theme="$1"])')
  .replace(/\[data-density="compact"\]/g, ':host([data-density="compact"])')
  .replace(/(^|[\s,{])\[data-theme\]/g, "$1:host([data-theme])")
  .replace(/:root/g, ":host");
const adminCss = `${scopeToHost(tokens)}\n${ui}\n${frags(".css")}\n${adminSrc(".css")}`;
const adminJs = adminSrc(".js");

for (const out of [join(root, "dist"), join(root, "apps/docs/assets")]) {
  mkdirSync(join(out, "fonts"), { recursive: true });
  cpSync(subsetDir, join(out, "fonts"), { recursive: true });
  writeFileSync(join(out, "g.css"), `${fonts}\n${tokens}\n${ui}\n${frags(".css")}`);
  // icons first so g.icon() exists before the behaviour layer injects
  writeFileSync(join(out, "g-ui.js"), `${iconsJs}\n${uiJs}\n${frags(".js")}`);
  writeFileSync(join(out, "tokens.css"), tokens);
  writeFileSync(join(out, "g-admin.css"), adminCss);
  writeFileSync(join(out, "g-admin.js"), adminJs);
}

// 3. Tailwind v4 proof: same tokens through @theme inline, no config file.
run("npx @tailwindcss/cli -i apps/docs/tailwind/tw-input.css -o apps/docs/assets/tw.css --minify");

// 4. NumberFlow vendored for the vanilla app shell. Its one bare import,
// esm-env, resolves via an import map to this browser-constants shim.
cpSync(join(root, "node_modules/number-flow/dist"), join(root, "apps/docs/assets/vendor/number-flow"), { recursive: true });
cpSync(join(root, "node_modules/number-flow/LICENSE.md"), join(root, "apps/docs/assets/vendor/number-flow/LICENSE.md"));
writeFileSync(join(root, "apps/docs/assets/vendor/esm-env.js"),
  "export const BROWSER = true;\nexport const DEV = false;\nexport const NODE = false;\n");

// 5. React lab: vite build into the docs app, @dsCard marker kept first-line.
const reactDir = join(root, "packages/g-ui-react");
mkdirSync(join(reactDir, "demo/public/fonts"), { recursive: true });
cpSync(join(root, "apps/docs/assets/g.css"), join(reactDir, "demo/public/g.css"));
cpSync(subsetDir, join(reactDir, "demo/public/fonts"), { recursive: true });
run("npm run build --silent", reactDir);
const reactHtmlPath = join(root, "apps/docs/react/index.html");
let reactHtml = readFileSync(reactHtmlPath, "utf8");
const marker = readFileSync(join(reactDir, "demo/index.html"), "utf8").split("\n")[0];
if (!reactHtml.startsWith("<!-- @dsCard")) {
  reactHtml = marker + "\n" + reactHtml.replace(marker, "").trimStart();
  writeFileSync(reactHtmlPath, reactHtml);
}

// 6. shadcn-compatible registry: npx shadcn add <docs-url>/r/button.json
const regDir = join(root, "apps/docs/r");
mkdirSync(regDir, { recursive: true });
const compDir = join(reactDir, "src/components");
const shim = readFileSync(join(reactDir, "demo/shim.css"), "utf8");
const items = [];
for (const f of readdirSync(compDir).filter((f) => f.endsWith(".jsx"))) {
  const name = basename(f, ".jsx");
  const item = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name,
    type: "registry:ui",
    title: name[0].toUpperCase() + name.slice(1),
    description: `g-design ${name}: g tokens over Base UI and friends. Pair with g.css (or tokens.css + the react shim).`,
    files: [
      { path: `components/g/${f}`, content: readFileSync(join(compDir, f), "utf8"), type: "registry:ui" },
    ],
    css: undefined,
  };
  writeFileSync(join(regDir, `${name}.json`), JSON.stringify(item, null, 2));
  items.push({ name, type: "registry:ui", title: item.title, description: item.description, files: [{ path: `components/g/${f}`, type: "registry:ui" }] });
}
writeFileSync(join(regDir, "shim.css.json"), JSON.stringify({
  $schema: "https://ui.shadcn.com/schema/registry-item.json",
  name: "shim-css",
  type: "registry:ui",
  title: "React shim CSS",
  description: "Element equivalents for the parts g-ui.css drives with pseudo-elements or the Popover API.",
  files: [{ path: "components/g/shim.css", content: shim, type: "registry:ui" }],
}, null, 2));
writeFileSync(join(regDir, "registry.json"), JSON.stringify({
  $schema: "https://ui.shadcn.com/schema/registry.json",
  name: "g-design",
  homepage: "https://github.com/Volcanex/g-design",
  items,
}, null, 2));

// Perf budget: warn over budget, fail only at double. Sometimes going over
// is the right call; silently bloating never is.
const { gzipSync } = await import("node:zlib");
const gcssGz = gzipSync(readFileSync(join(root, "dist/g.css"))).length;
const fontsTotal = readdirSync(subsetDir).filter((f) => f.endsWith(".woff2"))
  .reduce((n, f) => n + readFileSync(join(subsetDir, f)).length, 0);
const budget = (name, actual, limit) => {
  const kb = (n) => (n / 1024).toFixed(1) + "KB";
  if (actual > limit * 2) { console.error(`BUDGET FAIL ${name}: ${kb(actual)} is over double the ${kb(limit)} budget`); process.exit(1); }
  if (actual > limit) console.warn(`budget warn ${name}: ${kb(actual)} (budget ${kb(limit)})`);
  else console.log(`budget ok ${name}: ${kb(actual)} of ${kb(limit)}`);
};
budget("g.css gzip", gcssGz, 18 * 1024);
budget("fonts total", fontsTotal, 200 * 1024);
// The public bundle carries the g-admin activation stub and nothing else of
// the overlay. This budget is what stops the rest of it leaking in.
budget("g-ui.js gzip", gzipSync(readFileSync(join(root, "dist/g-ui.js"))).length, 23 * 1024);

console.log("built dist/, apps/docs/assets/, apps/docs/react/, apps/docs/r/");

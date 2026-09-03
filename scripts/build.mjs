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
run('npx stylelint "packages/g-ui/src/*.css" "apps/docs/**/*.card.html" "apps/docs/ui_kits/**/*.html"');

// 2. Self-contained asset sets: dist/ (one-link-tag path) and the docs app.
const tokens = readFileSync(join(root, "packages/g-tokens/dist/tokens.css"), "utf8");
const fonts = readFileSync(join(root, "packages/g-tokens/dist/fonts.css"), "utf8");
const ui = readFileSync(join(root, "packages/g-ui/src/g-ui.css"), "utf8");
const iconsJs = readFileSync(join(root, "packages/g-icons/dist/g-icons.js"), "utf8");
const uiJs = readFileSync(join(root, "packages/g-ui/src/g-ui.js"), "utf8");

for (const out of [join(root, "dist"), join(root, "apps/docs/assets")]) {
  mkdirSync(join(out, "fonts"), { recursive: true });
  cpSync(join(root, "packages/g-tokens/fonts"), join(out, "fonts"), { recursive: true });
  writeFileSync(join(out, "g.css"), `${fonts}\n${tokens}\n${ui}`);
  // icons first so g.icon() exists before the behaviour layer injects
  writeFileSync(join(out, "g-ui.js"), `${iconsJs}\n${uiJs}`);
  writeFileSync(join(out, "tokens.css"), tokens);
}

// 3. Tailwind v4 proof: same tokens through @theme inline, no config file.
run("npx @tailwindcss/cli -i apps/docs/tailwind/tw-input.css -o apps/docs/assets/tw.css --minify");

// 4. NumberFlow vendored for the vanilla app shell. Its one bare import,
// esm-env, resolves via an import map to this browser-constants shim.
cpSync(join(root, "node_modules/number-flow/dist"), join(root, "apps/docs/assets/vendor/number-flow"), { recursive: true });
writeFileSync(join(root, "apps/docs/assets/vendor/esm-env.js"),
  "export const BROWSER = true;\nexport const DEV = false;\nexport const NODE = false;\n");

// 5. React lab: vite build into the docs app, @dsCard marker kept first-line.
const reactDir = join(root, "packages/g-ui-react");
mkdirSync(join(reactDir, "demo/public/fonts"), { recursive: true });
cpSync(join(root, "apps/docs/assets/g.css"), join(reactDir, "demo/public/g.css"));
cpSync(join(root, "packages/g-tokens/fonts"), join(reactDir, "demo/public/fonts"), { recursive: true });
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
    description: `g-system ${name}: g tokens over Base UI and friends. Pair with g.css (or tokens.css + the react shim).`,
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
  name: "g-system",
  homepage: "https://github.com/Volcanex/g-system",
  items,
}, null, 2));

console.log("built dist/, apps/docs/assets/, apps/docs/react/, apps/docs/r/");

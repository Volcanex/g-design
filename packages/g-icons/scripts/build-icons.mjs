// Inlines icons/*.svg into dist/g-icons.js. Each icon becomes markup with
// class "gi gi-<name>"; g.icon(name) hands it to the behaviour layer.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const icons = {};
for (const f of readdirSync(join(root, "icons")).filter((f) => f.endsWith(".svg"))) {
  const name = basename(f, ".svg");
  const src = readFileSync(join(root, "icons", f), "utf8");
  const inner = src.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>[\s\S]*$/, "").replace(/\s+/g, " ").trim();
  icons[name] = `<svg class="gi gi-${name}" viewBox="0 0 256 256" aria-hidden="true">${inner}</svg>`;
}

const js = `/* g-icons: generated from packages/g-icons/icons/*.svg. Do not edit. */
(() => {
  const g = (window.g = window.g || {});
  g.icons = ${JSON.stringify(icons, null, 2)};
  g.icon = (name) => g.icons[name] || "";
})();
`;
mkdirSync(join(root, "dist"), { recursive: true });
writeFileSync(join(root, "dist", "g-icons.js"), js);
console.log("dist/g-icons.js", Object.keys(icons).length, "icons");

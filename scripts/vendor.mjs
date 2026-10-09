/* Vendors the built design system into a consumer project.
   Usage: node scripts/vendor.mjs <target-static-dir>
   e.g.   node scripts/vendor.mjs ../g-command-web/core/static/css/gsys

   Copies dist/g.css, dist/g-ui.js and dist/fonts/ into the target and
   stamps each file with the version, so a project can tell how far behind
   it is. Copying, not linking, is deliberate: the redundancy is safe, and
   a consumer never breaks because this repo moved. Re-run to update. */
import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2];
if (!target) {
  console.error("usage: node scripts/vendor.mjs <target-static-dir>");
  process.exit(1);
}
const dist = join(root, "dist");
if (!existsSync(join(dist, "g.css"))) {
  console.error("dist/g.css missing. Run node scripts/build.mjs first.");
  process.exit(1);
}
const version = readFileSync(join(root, "pyproject.toml"), "utf8").match(/version = "([^"]+)"/)[1];
const stamp = `/* g-design@${version}, vendored, do not edit. Update: node scripts/vendor.mjs from the g-design repo. */\n`;

const out = resolve(target);
mkdirSync(out, { recursive: true });
// g-admin.js and g-admin.css are the admin overlay. They ride along because
// the stub inside g-ui.js resolves them from this directory, and they are
// separate files precisely so a visitor never downloads them.
for (const f of ["g.css", "g-ui.js", "g-admin.css", "g-admin.js"]) {
  writeFileSync(join(out, f), stamp + readFileSync(join(dist, f), "utf8"));
}
cpSync(join(dist, "fonts"), join(out, "fonts"), { recursive: true });
console.log(`g-design@${version} -> ${out} (g.css, g-ui.js, g-admin.css, g-admin.js, fonts/)`);
console.log('Link with: <link rel="stylesheet" href=".../g.css"> and <script defer src=".../g-ui.js"></script>');

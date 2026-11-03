/* Vendors the Preact view kit (packages/g-ui-preact/src) into a consumer.
   Usage: node scripts/vendor-preact.mjs <target-dir>
   e.g.   node scripts/vendor-preact.mjs ../g-studio/web/src/kit

   Copies kit.css and the ESM sources, each stamped with the version. Nothing
   to build: the JS keeps its bare preact and htm imports for the consumer's
   bundler. Like vendor.mjs, copying is deliberate: a consumer never breaks
   because this repo moved. Re-run to update. g.css still comes from vendor.mjs. */
import { mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2];
if (!target) {
  console.error("usage: node scripts/vendor-preact.mjs <target-dir>");
  process.exit(1);
}
const src = join(root, "packages/g-ui-preact/src");
const version = readFileSync(join(root, "pyproject.toml"), "utf8").match(/version = "([^"]+)"/)[1];
const stamp = `/* g-design@${version} g-ui-preact, vendored, do not edit. Update: node scripts/vendor-preact.mjs from the g-design repo. */\n`;

const out = resolve(target);
mkdirSync(out, { recursive: true });
// Drop files the kit no longer ships, so a rename never leaves a stale copy behind.
for (const f of readdirSync(out)) if (/\.(js|css)$/.test(f)) rmSync(join(out, f));
const files = readdirSync(src).filter((f) => !f.startsWith(".") && /\.(js|css)$/.test(f)).sort();
for (const f of files) writeFileSync(join(out, f), stamp + readFileSync(join(src, f), "utf8"));
console.log(`g-design@${version} g-ui-preact -> ${out} (${files.join(", ")})`);
console.log('CSS: @import ".../kit.css" after g.css. JS: import { AppShell, Dialog, ... } from ".../index.js".');

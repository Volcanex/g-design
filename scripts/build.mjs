// Full build: tokens from @radix-ui/colors, then a self-contained asset set
// for the docs app and a one-link-tag bundle at dist/g.css.
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
execSync("node packages/g-tokens/scripts/build-tokens.mjs", { cwd: root, stdio: "inherit" });

const tokens = readFileSync(join(root, "packages/g-tokens/dist/tokens.css"), "utf8");
const fonts = readFileSync(join(root, "packages/g-tokens/dist/fonts.css"), "utf8");
const ui = readFileSync(join(root, "packages/g-ui/src/g-ui.css"), "utf8");

for (const out of [join(root, "dist"), join(root, "apps/docs/assets")]) {
  mkdirSync(join(out, "fonts"), { recursive: true });
  cpSync(join(root, "packages/g-tokens/fonts"), join(out, "fonts"), { recursive: true });
  // One link tag, no build step: fonts + tokens + components.
  writeFileSync(join(out, "g.css"), `${fonts}\n${tokens}\n${ui}`);
  cpSync(join(root, "packages/g-ui/src/g-ui.js"), join(out, "g-ui.js"));
  writeFileSync(join(out, "tokens.css"), tokens);
}
console.log("built dist/ and apps/docs/assets/");

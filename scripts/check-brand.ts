import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
const legacyModelAllowed = new Set([
  "max",
  "src/lib/legacy.ts",
  "tests/migration.test.ts",
  "docs/GAMMA.md",
  "scripts/check-brand.ts",
]);
const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n");
const failures: string[] = [];
// Exact compatibility tokens, never a whole product file exemption.
const compatibility =
  /https:\/\/github\.com\/hiyroscript\/varek|https:\/\/hiyroscript\.github\.io\/varek\/|\/varek\/|varek\.preferences\.v1|varek-update|VAREK_(?:ACTION|PREVIEW_URL|URL)|privacy-varek|(["'`])varek-\1|(["'`])varek\2/g;
for (const path of files) {
  if (
    !existsSync(path) ||
    !/\.(ts|tsx|js|mjs|json|html|md|webmanifest|yml|css|svg)$/.test(path)
  )
    continue;
  const text = readFileSync(path, "utf8");
  if (!legacyModelAllowed.has(path) && /zulvyn/i.test(text))
    failures.push(`${path}: legacy model brand`);
  if (
    path === "scripts/check-brand.ts" ||
    path === "tests/migration.test.ts" ||
    path === "tests/browser/cole.spec.ts" ||
    path.startsWith("docs/") ||
    path === "README.md"
  )
    continue;
  if (/varek/i.test(text.replace(compatibility, "")))
    failures.push(`${path}: visible former product brand`);
  if (/\.css$/.test(path)) {
    for (const [color] of text.matchAll(/#[\da-f]{3,8}\b/gi)) {
      const hex = color.slice(1);
      const rgb =
        hex.length <= 4
          ? hex
              .slice(0, 3)
              .split("")
              .map((x) => x + x)
          : [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)];
      if (new Set(rgb.map((x) => x.toLowerCase())).size !== 1)
        failures.push(`${path}: non-neutral color ${color}`);
    }
  }
}
if (failures.length) throw new Error(failures.join("\n"));
console.log(
  "Cole product branding, monochrome styles, and legacy model audit passed.",
);

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
const allowed = new Set([
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
const failures = files.filter(
  (p) =>
    existsSync(p) &&
    !allowed.has(p) &&
    /\.(?:ts|tsx|js|mjs|json|html|md|webmanifest|yml)$/.test(p) &&
    /zulvyn/i.test(readFileSync(p, "utf8")),
);
if (failures.length)
  throw new Error(
    "Legacy brand outside compatibility allowlist: " + failures.join(", "),
  );
console.log("Gamma branding audit passed.");

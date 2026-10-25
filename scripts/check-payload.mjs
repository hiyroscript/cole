import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const manifest = JSON.parse(await readFile("dist/.vite/manifest.json", "utf8"));
const files = new Set();
function visit(key) {
  const item = manifest[key];
  if (!item || files.has(item.file)) return;
  files.add(item.file);
  for (const child of item.imports ?? []) visit(child);
}
visit("index.html");
let raw = 0,
  gzip = 0;
for (const file of files) {
  const bytes = await readFile("dist/" + file);
  raw += bytes.length;
  gzip += gzipSync(bytes).length;
}
console.log(
  JSON.stringify({
    initialJavaScriptBytes: raw,
    initialGzipBytes: gzip,
    assets: [...files],
    limits: { raw: 650000, gzip: 210000 },
  }),
);
if (raw > 650000 || gzip > 210000)
  throw new Error(
    "Initial JavaScript exceeds the unchanged Gamma payload budget.",
  );

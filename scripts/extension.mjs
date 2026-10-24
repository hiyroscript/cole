import { copyFile, rm } from "node:fs/promises";
import { build } from "esbuild";
for (const file of ["manifest.json", "popup.html", "popup.js", "popup.css"])
  await copyFile("extension/" + file, "dist-extension/" + file);
await build({
  entryPoints: ["extension/background.ts"],
  bundle: true,
  format: "esm",
  target: "chrome116",
  outfile: "dist-extension/background.js",
});
await rm("dist-extension/manifest.webmanifest", { force: true });
console.log("Unpacked Chromium extension: dist-extension/");

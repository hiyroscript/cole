import { copyFile, rm, readdir } from "node:fs/promises";
import { build } from "esbuild";
for (const file of ["manifest.json", "popup.html", "popup.js", "popup.css"])
  await copyFile("extension/" + file, "dist-extension/" + file);
await copyFile("src/styles/tokens.css", "dist-extension/tokens.css");
await build({
  entryPoints: ["extension/background.ts"],
  bundle: true,
  format: "esm",
  target: "chrome116",
  outfile: "dist-extension/background.js",
});
await rm("dist-extension/manifest.webmanifest", { force: true });
console.log("Unpacked Chromium extension: dist-extension/");

// Vite may emit a worker asset before tree shaking the website-only runtime.
// Never ship the unused inference executable in the MV3 package.
for (const file of await readdir("dist-extension/assets"))
  if (
    file.endsWith(".wasm") ||
    /^(worker|transport|engine|semantic-worker|ort)-.*\.js$/.test(file)
  )
    await rm("dist-extension/assets/" + file);

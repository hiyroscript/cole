import { copyFile, readdir } from "node:fs/promises";
// Runtime WASM stays outside the PWA shell and extension package.
const dir = "node_modules/onnxruntime-web/dist";
for (const file of await readdir(dir))
  if (
    [
      "ort-wasm-simd-threaded.jsep.wasm",
      "ort-wasm-simd-threaded.jsep.mjs",
    ].includes(file)
  )
    await copyFile(`${dir}/${file}`, `dist/${file}`);

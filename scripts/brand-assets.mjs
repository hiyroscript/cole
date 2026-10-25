import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
const master = await readFile("public/logo.svg");
async function icon(size, name, coverage = 0.76) {
  const mark = await sharp(master)
    .resize(Math.round(size * coverage), Math.round(size * coverage), {
      fit: "inside",
    })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: "#ffffff" },
  })
    .composite([{ input: mark, gravity: "centre" }])
    .png()
    .toFile(`public/${name}`);
}
for (const size of [16, 32, 128, 192, 512])
  await icon(size, `icon-${size}.png`, size <= 32 ? 0.88 : 0.76);
await icon(32, "favicon.png", 0.88);
await icon(180, "apple-touch-icon.png");
// Entire mark stays within the central 80% safe-zone circle.
await icon(512, "icon-maskable-512.png", 0.56);
const inner = master
  .toString()
  .match(/<path[\s\S]*?<\/svg>/)[0]
  .replace("</svg>", "");
await writeFile(
  "public/wordmark.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 64"><g transform="translate(-8 -10) scale(.17)">${inner}</g><text x="76" y="48" font-family="Georgia,serif" font-size="54" letter-spacing="-2">Cole</text></svg>\n`,
);
console.log("Cole SVG master, wordmark and eight PNG platform assets ready.");

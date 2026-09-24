// Renders public/icon.svg into the PNG icons phones need (iOS ignores SVG
// apple-touch icons; Android wants 192/512 + a maskable variant).
// Run: node scripts/make-icons.mjs
import sharp from "sharp";
import fs from "fs/promises";

const svg = await fs.readFile("public/icon.svg");

// Full-bleed square (no rounded corners — the OS applies its own mask).
const square = Buffer.from(
  svg.toString().replace(/rx="16"/, 'rx="0"')
);
// Maskable: artwork shrunk into the central 80% safe zone.
const maskable = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#40101a"/><g transform="translate(6.4 6.4) scale(0.8)">${svg
    .toString()
    .replace(/^[\s\S]*?<rect[^>]*\/>/, "")
    .replace(/<\/svg>\s*$/, "")}</g></svg>`
);

// Launch-screen icon: the SUTRA wordmark (not the S mark) on the maroon
// background_color. Android draws its native launch screen from the largest
// "any" manifest icon, while the home-screen icon comes from the maskable one —
// so the app opens on "SUTRA" but keeps the S on the home screen. The artwork
// stays inside the central circle Android 12+ crops launch icons to.
const splash = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#40101a"/>
  <text x="256" y="276" text-anchor="middle" font-family="Georgia" font-weight="bold" font-size="66" letter-spacing="14" fill="#f8eeda">SUTRA</text>
  <rect x="211" y="304" width="90" height="4" rx="2" fill="#e5c383"/>
</svg>`);

const out = [
  ["public/apple-touch-icon.png", square, 180],
  ["public/icon-192.png", svg, 192],
  ["public/icon-512.png", svg, 512],
  ["public/icon-maskable-512.png", maskable, 512],
  ["public/splash-512.png", splash, 512],
];
for (const [file, src, size] of out) {
  await sharp(src, { density: 600 }).resize(size, size).png().toFile(file);
  console.log("wrote", file);
}

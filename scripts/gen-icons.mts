// Generates the PWA raster icons from the same "depth bars" mark as app/icon.svg,
// so all the icons stay in sync if the brand mark changes. Run: `npm run gen:icons`.
//
// Outputs:
//   public/icon-192.png            — manifest, purpose "any"
//   public/icon-512.png            — manifest, purpose "any"
//   public/icon-maskable-512.png   — manifest, purpose "maskable" (safe-zone inset)
//   app/apple-icon.png (180)       — iOS home screen (Next injects the <link>)
//
// The mark is a 16-unit grid: dark rounded square (#0a0e1a) + three descending white
// bars, identical geometry to app/icon.svg and the in-app wordmark.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BG = '#0a0e1a';
const FG = '#f0f4ff';

// The three bars on the shared 16-unit grid (top bar is horizontally centered; the
// cluster is vertically centered on the grid, so it scales about the center cleanly).
const bars = `
    <rect x="2.5" y="4" width="11" height="2" rx="1" fill="${FG}" />
    <rect x="2.5" y="7" width="8" height="2" rx="1" fill="${FG}" />
    <rect x="2.5" y="10" width="5" height="2" rx="1" fill="${FG}" />`;

// "any" icon: rounded dark square + bars (matches the SVG favicon).
function anyIcon(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect width="16" height="16" rx="3" fill="${BG}" />${bars}
  </svg>`;
}

// Apple touch icon: opaque, full-bleed background (iOS applies its own rounding and
// dislikes transparency), same bar layout.
function appleIcon(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect width="16" height="16" fill="${BG}" />${bars}
  </svg>`;
}

// Maskable icon: full-bleed background so the platform's mask never clips a corner,
// with the bar cluster scaled toward the center (0.72) to sit inside the safe zone.
function maskableIcon(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <rect width="16" height="16" fill="${BG}" />
    <g transform="translate(8 8) scale(0.72) translate(-8 -8)">${bars}
    </g>
  </svg>`;
}

async function write(svg: string, size: number, outPath: string) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
  console.log(`wrote ${outPath} (${size}x${size})`);
}

await write(anyIcon(192), 192, join(root, 'public/icon-192.png'));
await write(anyIcon(512), 512, join(root, 'public/icon-512.png'));
await write(maskableIcon(512), 512, join(root, 'public/icon-maskable-512.png'));
await write(appleIcon(180), 180, join(root, 'app/apple-icon.png'));

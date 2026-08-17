// Generates the PWA raster icons from the same first-down marker + depth bars mark
// as app/icon.svg, so all icons stay in sync. Run: `npm run gen:icons`.
//
// Outputs:
//   public/icon-192.png            — manifest, purpose "any"
//   public/icon-512.png            — manifest, purpose "any"
//   public/icon-maskable-512.png   — manifest, purpose "maskable" (safe-zone inset)
//   app/apple-icon.png (180)       — iOS home screen (Next injects the <link>)
//
// The mark uses a 1024-unit source grid so the app icon and in-app marks share exact
// proportions at both 16px and App Store sizes.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BG = '#0A0E1A';
const ORANGE = '#FF6500';
const FG = '#FFFFFF';

const mark = `
    <circle cx="270" cy="270" r="132" fill="${ORANGE}" />
    <circle cx="270" cy="270" r="82" fill="${BG}" />
    <circle cx="270" cy="270" r="50" fill="${ORANGE}" />
    <defs>
      <clipPath id="marker-pole">
        <path d="M190 405h160l-28 435q-2 22-24 22h-56q-22 0-24-22l-28-435Z" />
      </clipPath>
    </defs>
    <g clip-path="url(#marker-pole)">
      <rect x="160" y="405" width="220" height="470" fill="${ORANGE}" />
      <rect x="160" y="490" width="220" height="52" fill="${FG}" />
      <rect x="160" y="610" width="220" height="52" fill="${FG}" />
    </g>
    <rect x="420" y="415" width="410" height="96" rx="29" fill="${FG}" />
    <rect x="420" y="565" width="275" height="96" rx="29" fill="${FG}" />
    <rect x="420" y="715" width="155" height="96" rx="29" fill="${FG}" />`;

// "any" icon: rounded dark square + bars (matches the SVG favicon).
function anyIcon(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" rx="190" fill="${BG}" />${mark}
  </svg>`;
}

// Apple touch icon: opaque, full-bleed background (iOS applies its own rounding and
// dislikes transparency), same bar layout.
function appleIcon(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" fill="${BG}" />${mark}
  </svg>`;
}

// Maskable icon: full-bleed background so the platform's mask never clips a corner,
// with the bar cluster scaled toward the center (0.72) to sit inside the safe zone.
function maskableIcon(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" fill="${BG}" />
    <g transform="translate(512 512) scale(0.72) translate(-512 -512)">${mark}
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

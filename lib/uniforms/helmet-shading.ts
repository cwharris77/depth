/**
 * Resolves the generated helmet art's lightness offsets against a kit surface color.
 * Keep this pure and team-neutral: callers supply the base color for each rendered role.
 */
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

// A page can shade roughly 32 team colors across 236 shell/facemask paths. Keeping one
// page's working set avoids recalculating SVG fills without letting a long-lived process grow.
const MAX_CACHE_ENTRIES = 8_192;
const shadeCache = new Map<string, string>();

function hueToRgb(p: number, q: number, hue: number): number {
  let wrappedHue = hue;
  if (wrappedHue < 0) wrappedHue += 1;
  if (wrappedHue > 1) wrappedHue -= 1;
  if (wrappedHue < 1 / 6) return p + (q - p) * 6 * wrappedHue;
  if (wrappedHue < 1 / 2) return q;
  if (wrappedHue < 2 / 3) return p + (q - p) * (2 / 3 - wrappedHue) * 6;
  return p;
}

function rgbToHsl(red: number, green: number, blue: number): [number, number, number] {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  if (max === min) return [0, 0, lightness];

  const range = max - min;
  const saturation = lightness <= 0.5 ? range / (max + min) : range / (2 - max - min);
  let hue: number;

  if (max === red) hue = (green - blue) / range + (green < blue ? 6 : 0);
  else if (max === green) hue = (blue - red) / range + 2;
  else hue = (red - green) / range + 4;

  return [hue / 6, saturation, lightness];
}

function hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
  if (saturation === 0) return [lightness, lightness, lightness];

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;
  return [hueToRgb(p, q, hue + 1 / 3), hueToRgb(p, q, hue), hueToRgb(p, q, hue - 1 / 3)];
}

// Python's round() uses ties-to-even; matching it keeps this port byte-identical at .5.
function pythonRound(value: number): number {
  const floor = Math.floor(value);
  const fraction = value - floor;
  if (fraction > 0.5 || (fraction === 0.5 && floor % 2 !== 0)) return floor + 1;
  return floor;
}

function toHex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue]
    .map((channel) =>
      pythonRound(channel * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`.toUpperCase();
}

export function shadeFor(base: string, dl: number): string {
  if (!HEX_COLOR.test(base) || !Number.isFinite(dl)) return base;

  const normalizedBase = base.toUpperCase();
  const cacheKey = `${normalizedBase}:${dl}`;
  const cached = shadeCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const red = Number.parseInt(normalizedBase.slice(1, 3), 16) / 255;
  const green = Number.parseInt(normalizedBase.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(normalizedBase.slice(5, 7), 16) / 255;
  const [hue, saturation, lightness] = rgbToHsl(red, green, blue);
  const shiftedLightness = Math.max(0, Math.min(1, lightness + dl));
  const shade = toHex(...hslToRgb(hue, saturation, shiftedLightness));

  if (shadeCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = shadeCache.keys().next().value;
    if (oldestKey !== undefined) shadeCache.delete(oldestKey);
  }
  shadeCache.set(cacheKey, shade);
  return shade;
}

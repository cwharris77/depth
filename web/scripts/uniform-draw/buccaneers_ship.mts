import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { boundsOf } from '../../lib/uniforms/teams/core/marks';

// Converts an absolute-path SVG with translated paths into a sleeve mark, retaining paint order.
const source = process.argv[2];
if (!source) throw new Error('Usage: tsx scripts/uniform-draw/buccaneers_ship.mts <ship.svg>');
const elements = [...readFileSync(source, 'utf8').matchAll(/<path\b([^>]+)\/>/g)];
const paths = elements.slice(1).map((element) => {
  const attributes = Object.fromEntries(
    [...element[1].matchAll(/(\w+)="([^"]+)"/g)].map((m) => [m[1], m[2]])
  );
  const translation = /^translate\(([-\d.]+),([-\d.]+)\)$/.exec(attributes.transform);
  if (!translation || /[^MCZ\d.,\s-]/.test(attributes.d)) throw new Error('Unsupported SVG path');
  const d = attributes.d.replace(
    /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g,
    (_, x, y) =>
      `${(Number(x) + Number(translation[1])).toFixed(3)} ${(Number(y) + Number(translation[2])).toFixed(3)}`
  );
  return { d, slot: `ship-${attributes.fill.slice(1).toLowerCase()}` };
});
const boxes = paths.map((path) => boundsOf(path.d));
const box = [
  Math.min(...boxes.map((b) => b[0])),
  Math.min(...boxes.map((b) => b[1])),
  Math.max(...boxes.map((b) => b[2])),
  Math.max(...boxes.map((b) => b[3])),
];
const colors = Object.fromEntries(
  paths.map(({ slot }) => [slot, `#${slot.slice(5).toUpperCase()}`])
);
writeFileSync(
  fileURLToPath(new URL('../../lib/uniforms/teams/buccaneers/marks/ship.ts', import.meta.url)),
  `// Generated ship geometry; regenerate with scripts/uniform-draw/buccaneers_ship.mts.\nimport type { Mark } from '../../core/marks';\nexport const BUCCANEERS_SHIP_COLORS = ${JSON.stringify(colors)};\nexport const BUCCANEERS_SHIP: Mark = ${JSON.stringify({ box, paths })};\n`
);

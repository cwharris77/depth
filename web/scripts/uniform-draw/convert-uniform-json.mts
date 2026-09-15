// Converts model-authored uniform JSON into ordinary parts geometry. Fonts are resolved and
// outlined here so runtime SVG rendering never depends on an installed font or model text.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  authoredJerseys,
  formatValidationIssues,
  jerseySurfaceIssues,
  validateAuthoredDefinition,
} from '@/lib/uniforms/teams/validate';

type JsonLayer = {
  id: string;
  surface: string;
  d: string;
  clip: boolean;
  kind: 'fill' | 'stroke';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  fillRule?: 'nonzero' | 'evenodd';
};

type JsonJersey = {
  base: string;
  layers: JsonLayer[];
  number?: Record<string, unknown>;
};

type JsonDefinition = {
  teamId: string;
  target?: { kind: string; id: string };
  palette: Record<string, string>;
  jersey?: JsonJersey;
  jerseys: Record<string, JsonJersey>;
  patterns?: Record<
    string,
    {
      width: number;
      height: number;
      transform?: string;
      gradient?: { stops: Array<{ color: string }> };
      shapes: Array<{ d: string; fill?: string }>;
    }
  >;
  helmets?: Record<string, unknown>;
  pants?: Record<string, unknown>;
  kits?: Record<string, unknown>;
  wordmarks?: Array<Record<string, unknown>>;
};

const HERE = dirname(fileURLToPath(import.meta.url));
const PYTHON = process.env.WORDMARK_PY ?? '/tmp/fontvenv/bin/python';
const OUTLINER = join(HERE, 'outline-wordmark.py');
const FONTS: Record<string, string> = {
  'chest-wordmark': '/System/Library/Fonts/Supplemental/Copperplate.ttc',
  'collar-label': '/System/Library/Fonts/Supplemental/Arial Narrow Bold.ttf',
  'athletic-numeral': '/System/Library/Fonts/Supplemental/DIN Alternate Bold.ttf',
};
const FONT_NUMBERS: Record<string, number> = {
  'chest-wordmark': 0,
  'collar-label': 0,
  'athletic-numeral': 0,
};

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`invalid ${field}`);
  return value;
}

function outline(
  text: string,
  font: string,
  size: number,
  centerX: number,
  baselineY: number,
  tracking = 0
) {
  return execFileSync(
    PYTHON,
    [
      OUTLINER,
      '--text',
      text,
      '--font',
      font,
      '--font-number',
      String(
        FONT_NUMBERS[Object.keys(FONTS).find((key) => FONTS[key] === font) ?? 'chest-wordmark']
      ),
      '--size',
      String(size),
      '--center-x',
      String(centerX),
      '--baseline-y',
      String(baselineY),
      '--tracking',
      String(tracking),
    ],
    { encoding: 'utf8' }
  ).trim();
}

function layerFromWordmark(wordmark: Record<string, unknown>, index: number): JsonLayer {
  const role = String(
    wordmark.role ?? (String(wordmark.surface) === 'collar' ? 'collar-label' : 'chest-wordmark')
  );
  const font = FONTS[role] ?? FONTS['chest-wordmark'];
  return {
    id: requiredString(wordmark.id ?? `wordmark-${index}`, 'wordmark id'),
    surface: requiredString(wordmark.surface, 'wordmark surface'),
    d: outline(
      requiredString(wordmark.text, 'wordmark text'),
      font,
      Number(wordmark.size ?? 32),
      Number(wordmark.centerX ?? 294),
      Number(wordmark.baselineY ?? 520),
      Number(wordmark.tracking ?? 0)
    ),
    clip: true,
    kind: 'fill',
    fill: requiredString(wordmark.fill, 'wordmark fill'),
  };
}

function js(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/"([^"\\]+)":/g, '$1:');
}

const partial = process.argv.includes('--partial');
const args = process.argv.filter((arg) => arg !== '--partial');
const [input, output] = args.slice(2);
if (!input || !output) throw new Error('usage: convert-uniform-json.mts <input.json> <output.ts>');
const definition = JSON.parse(readFileSync(resolve(input), 'utf8')) as JsonDefinition;

// Fail before outlining or emitting anything: an unresolved palette key or an invalid path
// would otherwise produce plausible-but-wrong geometry that no downstream test would catch.
const issues = validateAuthoredDefinition(definition);
if (issues.length > 0) {
  throw new Error(`invalid authored uniform JSON:\n${formatValidationIssues(issues)}`);
}

const authoredJerseyParts = authoredJerseys(
  definition as unknown as Record<string, unknown>
) as Record<string, JsonJersey>;

const wordmarkLayers = (definition.wordmarks ?? []).map(layerFromWordmark);
const jerseys = Object.fromEntries(
  Object.entries(authoredJerseyParts).map(([id, jersey]) => {
    const layers = [...jersey.layers, ...wordmarkLayers];
    const number = jersey.number ? { ...jersey.number } : undefined;
    if (number && typeof number.text === 'string') {
      number.glyphPath = outline(number.text, FONTS['athletic-numeral'], 155, 294, 694, 0);
      delete number.text;
    }
    return [id, { ...jersey, layers, number }];
  })
);

const parts = {
  teamId: definition.teamId,
  patterns: Object.fromEntries(
    Object.entries(definition.patterns ?? {}).map(([id, pattern]) => [
      id,
      {
        width: pattern.width,
        height: pattern.height,
        transform: pattern.transform,
        gradient: pattern.gradient,
        shapes: pattern.shapes.map((shape) => ({
          d: shape.d,
          fill: shape.fill ?? pattern.gradient?.stops[0]?.color ?? '#000000',
        })),
      },
    ])
  ),
  palette: definition.palette,
  helmets: definition.helmets ?? {},
  jerseys,
  pants: definition.pants ?? {},
  kits: definition.kits ?? {},
};

// A full definition's first jersey is its canonical output. A partial update must name the
// jersey it replaces: the earlier code selected `Object.keys(jerseys)[0]`, so a multi-jersey
// input silently updated the wrong part.
let selectedJersey = Object.keys(jerseys)[0];
if (partial) {
  const targetId = definition.target?.id;
  if (!targetId) throw new Error('--partial requires target.id');
  if (!Object.prototype.hasOwnProperty.call(jerseys, targetId)) {
    throw new Error(`--partial target.id "${targetId}" does not resolve to an authored jersey`);
  }
  const surfaceIssues = jerseySurfaceIssues(`jerseys.${targetId}`, authoredJerseyParts[targetId]);
  if (surfaceIssues.length > 0) throw new Error(formatValidationIssues(surfaceIssues));
  selectedJersey = targetId;
}
const generatedPatterns = parts.patterns;
const source = partial
  ? `// Generated from model authoring JSON. Do not hand-edit outlined paths.\nimport type { UniformPart } from './parts';\nimport type { PatternDef } from './types';\n\nexport const ${definition.teamId.toUpperCase()}_PATTERNS: Record<string, PatternDef> = ${js(generatedPatterns)};\n\nexport const ${definition.teamId.toUpperCase()}_${selectedJersey.replace(/[^a-z0-9]+/gi, '_').toUpperCase()}_JERSEY: UniformPart = ${js(jerseys[selectedJersey])};\n`
  : `// Generated from model authoring JSON. Do not hand-edit outlined paths.\nimport type { TeamPartsDefinition } from './parts';\n\nexport const ${definition.teamId.toUpperCase()}_PARTS: TeamPartsDefinition = ${js(parts)};\n`;
writeFileSync(resolve(output), source);

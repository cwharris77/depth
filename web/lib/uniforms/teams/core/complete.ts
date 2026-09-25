// Complete forms of the construction specs: every optional field is required, and absence is
// written out -- 'none' where the detail is not there, or a named default where leaving it out
// means "use the default". A skipped detail is then a type error instead of a silent omission.
// The converters map a complete spec back to the form the expanders read.
import type { HelmetSpec } from './helmet-spec';
import type {
  JerseyBand,
  JerseyGap,
  JerseyMarkUse,
  JerseyNumber,
  JerseySize,
  JerseySpec,
} from './jersey-spec';
import type { PantsMarkUse, PantsSpec, SocksSpec, StripeStack } from './pants-spec';

type None = 'none';

// Only the fields a style's expander branch (collarLayers in jersey-spec.ts) actually reads:
// 'shallow-v'/'rounded' draw the band and its trim; only 'inset-v' honours inside/lining/backBar
// and the keyline outline.
export type CompleteCollar =
  | { style: 'none' }
  | { style: 'shallow-v'; color: string | None; trim: string | None }
  | { style: 'rounded'; color: string | None; trim: string | None }
  | {
      style: 'inset-v';
      color: string | None;
      trim: string | None;
      // 'body' fills the neck opening with the body colour.
      inside: string | 'body';
      lining: string | None;
      backBar: string | None;
      outline: boolean;
    };

export interface CompleteStripeStack {
  bands: JerseyBand[];
  gap: JerseyGap;
  edge: string | None;
}

export interface CompleteJerseySpec {
  body: string;
  collar: CompleteCollar;
  shoulderPanel: { bands: JerseyBand[] } | None;
  shoulderStripes: { bands: JerseyBand[]; gap: JerseyGap } | None;
  shoulderNumber: { fill: string; outline: string | None } | None;
  sleeveStripes: CompleteStripeStack | None;
  cuff: { color: string; size: JerseySize } | None;
  sleeveNumber: { fill: string } | None;
  number: Required<JerseyNumber>;
  // Empty when the jersey carries no mark.
  marks: readonly JerseyMarkUse[];
}

export interface CompletePantsSpec {
  body: string;
  stripes: (CompleteStripeStack & { position: 'center' | 'leg-edge' }) | None;
  // Empty when the pants carry no mark.
  marks: readonly PantsMarkUse[];
}

export interface CompleteSocksSpec {
  color: string;
  stripes: CompleteStripeStack | None;
}

// Every HelmetSpec field is already required.
export type CompleteHelmetSpec = HelmetSpec;

const given = <T>(value: T | None): T | undefined => (value === 'none' ? undefined : value);

function stack(c: CompleteStripeStack): StripeStack {
  return { bands: c.bands, gap: c.gap, ...(c.edge !== 'none' && { edge: c.edge }) };
}

export function jerseySpecOf(c: CompleteJerseySpec): JerseySpec {
  const { collar } = c;
  const collarOut: JerseySpec['collar'] = { style: collar.style };
  if (collar.style !== 'none') {
    if (collar.color !== 'none') collarOut.color = collar.color;
    if (collar.trim !== 'none') collarOut.trim = collar.trim;
  }
  if (collar.style === 'inset-v') {
    if (collar.inside !== 'body') collarOut.inside = collar.inside;
    if (collar.lining !== 'none') collarOut.lining = collar.lining;
    if (collar.backBar !== 'none') collarOut.backBar = collar.backBar;
    collarOut.outline = collar.outline;
  }
  const { texture, ...number } = c.number;
  const spec: JerseySpec = {
    body: c.body,
    collar: collarOut,
    // 'mesh' is the expander's default, so only 'plain' is carried over.
    number: texture === 'plain' ? c.number : number,
  };
  const shoulderPanel = given(c.shoulderPanel);
  if (shoulderPanel) spec.shoulderPanel = shoulderPanel;
  const shoulderStripes = given(c.shoulderStripes);
  if (shoulderStripes) spec.shoulderStripes = shoulderStripes;
  const shoulderNumber = given(c.shoulderNumber);
  if (shoulderNumber) {
    spec.shoulderNumber = {
      fill: shoulderNumber.fill,
      ...(shoulderNumber.outline !== 'none' && { outline: shoulderNumber.outline }),
    };
  }
  const sleeveStripes = given(c.sleeveStripes);
  if (sleeveStripes) spec.sleeveStripes = stack(sleeveStripes);
  const cuff = given(c.cuff);
  if (cuff) spec.cuff = cuff;
  const sleeveNumber = given(c.sleeveNumber);
  if (sleeveNumber) spec.sleeveNumber = sleeveNumber;
  if (c.marks.length > 0) spec.marks = c.marks;
  return spec;
}

export function pantsSpecOf(c: CompletePantsSpec): PantsSpec {
  const stripes = given(c.stripes);
  return {
    body: c.body,
    ...(stripes && { stripes: { ...stack(stripes), position: stripes.position } }),
    ...(c.marks.length > 0 && { marks: c.marks }),
  };
}

export function socksSpecOf(c: CompleteSocksSpec): SocksSpec {
  const stripes = given(c.stripes);
  return { color: c.color, ...(stripes && { stripes: stack(stripes) }) };
}

export type SpecSurface = 'jersey' | 'pants' | 'socks' | 'helmet';

// Fixed rather than derived from `keyof CompleteCollar`: CompleteCollar is now a discriminated
// union, so its keys differ per style and no longer name one flat set of questions.
type CollarPath =
  | 'collar.style'
  | 'collar.color'
  | 'collar.trim'
  | 'collar.inside'
  | 'collar.lining'
  | 'collar.backBar'
  | 'collar.outline';

// One question per field, asked of the reference during authoring. Keyed by the complete type's
// fields, so adding a field without a question is a type error. Every collar.* question is asked
// regardless of style; findMissing below only requires the ones the stated style actually uses.
const JERSEY_QUESTIONS: Record<Exclude<keyof CompleteJerseySpec, 'collar'> | CollarPath, string> = {
  body: 'What colour is the jersey body?',
  'collar.style': 'Is the collar a shallow V, an inset V, rounded, or not drawn?',
  'collar.color': 'What colour is the collar band?',
  'collar.trim': 'Is there a second, thinner trim line on the collar, and what colour?',
  'collar.inside': 'What colour is the neck opening inside the collar?',
  'collar.lining': 'Is there a contrasting collar lining, and what colour?',
  'collar.backBar': 'Is there a bar across the back of the neck, and what colour?',
  'collar.outline': 'Does the collar have a dark outline against the body?',
  shoulderPanel:
    'Are there colour blocks at the top of each sleeve, and in what sizes and colours?',
  shoulderStripes: 'Are there canted stripes running down from the shoulder line?',
  shoulderNumber: 'Is there a numeral on top of each shoulder, and does it have an outline?',
  sleeveStripes: 'Are there stripes around the upper arm, and are they piped?',
  cuff: 'Is there a solid band at the sleeve opening?',
  sleeveNumber: 'Is there a small numeral on the lower outer sleeve?',
  number:
    'What are the chest numeral fill, outline colour and outline weight, and is it mesh-textured or plain?',
  marks: 'Which logos or wordmarks appear on the sleeves, shoulders or chest?',
};

const PANTS_QUESTIONS: Record<keyof CompletePantsSpec, string> = {
  body: 'What colour are the pants?',
  stripes: 'Is there a leg stripe, where does it sit, and is it piped?',
  marks: 'What art on the pants can the stripe fields not describe, such as panels or logos?',
};

const SOCKS_QUESTIONS: Record<keyof CompleteSocksSpec, string> = {
  color: 'What colour are the socks?',
  stripes: 'Are there hoops around the calf?',
};

const HELMET_QUESTIONS: Record<keyof CompleteHelmetSpec, string> = {
  shell: 'What colour is the helmet shell?',
  facemask: 'What colour is the facemask?',
  decal: 'What art is on the shell side, crown stripes included?',
  number: 'Is there a player number on the helmet, and what colour?',
};

export const QUESTIONS: Record<SpecSurface, Readonly<Record<string, string>>> = {
  jersey: JERSEY_QUESTIONS,
  pants: PANTS_QUESTIONS,
  socks: SOCKS_QUESTIONS,
  helmet: HELMET_QUESTIONS,
};

// Sub-keys a field's value must carry once it is stated (not 'none'/absent). A `'none'` value
// needs none of them: there is nothing underneath to ask about.
const SUB_KEYS: Partial<Record<SpecSurface, Record<string, readonly string[]>>> = {
  jersey: {
    shoulderPanel: ['bands'],
    shoulderStripes: ['bands', 'gap'],
    shoulderNumber: ['fill', 'outline'],
    sleeveStripes: ['bands', 'gap', 'edge'],
    cuff: ['color', 'size'],
    sleeveNumber: ['fill'],
    number: ['fill', 'outline', 'outlineWeight', 'texture'],
  },
  pants: {
    stripes: ['position', 'bands', 'gap', 'edge'],
  },
  socks: {
    stripes: ['bands', 'gap', 'edge'],
  },
  helmet: {
    number: ['fill'],
  },
};

// The collar.* fields each style's branch in collarLayers (jersey-spec.ts) actually reads.
const COLLAR_FIELDS: Record<string, readonly string[]> = {
  none: [],
  'shallow-v': ['color', 'trim'],
  rounded: ['color', 'trim'],
  'inset-v': ['color', 'trim', 'inside', 'lining', 'backBar', 'outline'],
};

function has(value: unknown, path: string): boolean {
  let at: unknown = value;
  for (const key of path.split('.')) {
    if (typeof at !== 'object' || at === null || !Object.hasOwn(at, key)) return false;
    at = (at as Record<string, unknown>)[key];
  }
  // Null is treated as missing everywhere: a spec that states a field is null has not actually
  // answered the question any more than leaving it out.
  return at !== undefined && at !== null;
}

function fieldAt(value: unknown, path: string): unknown {
  let at: unknown = value;
  for (const key of path.split('.')) {
    if (typeof at !== 'object' || at === null) return undefined;
    at = (at as Record<string, unknown>)[key];
  }
  return at;
}

function collarStyleOf(value: unknown): string | undefined {
  const style = fieldAt(value, 'collar.style');
  return typeof style === 'string' ? style : undefined;
}

// Checklist paths a (JSON) spec leaves out, in question-table order, then sub-key order.
export function findMissing(surface: SpecSurface, value: unknown): string[] {
  const out: string[] = [];
  const subKeysFor = SUB_KEYS[surface] ?? {};
  for (const path of Object.keys(QUESTIONS[surface])) {
    if (surface === 'jersey' && path.startsWith('collar.') && path !== 'collar.style') {
      const field = path.slice('collar.'.length);
      const style = collarStyleOf(value);
      // Without a known style there is nothing to check the field against; collar.style itself
      // is reported separately, by the normal path below.
      if (style === undefined || !COLLAR_FIELDS[style]?.includes(field)) continue;
    }
    if (!has(value, path)) {
      out.push(path);
      continue;
    }
    const subKeys = subKeysFor[path];
    if (subKeys && fieldAt(value, path) !== 'none') {
      for (const sub of subKeys) {
        if (!has(value, `${path}.${sub}`)) out.push(`${path}.${sub}`);
      }
    }
  }
  return out;
}

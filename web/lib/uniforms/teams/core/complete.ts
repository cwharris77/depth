// Complete forms of the construction specs: every optional field is required, and absence is
// written out -- 'none' where the detail is not there, or a named default where leaving it out
// means "use the default". A skipped detail is then a type error instead of a silent omission.
// The converters map a complete spec back to the form the expanders read.
import type { HelmetSpec } from './helmet-spec';
import type { JerseyBand, JerseyGap, JerseyMarkUse, JerseySize, JerseySpec } from './jersey-spec';
import type { PantsSpec, SocksSpec, StripeStack } from './pants-spec';

type None = 'none';

export interface CompleteCollar {
  style: JerseySpec['collar']['style'];
  color: string | None;
  trim: string | None;
  // 'body' fills the neck opening with the body colour.
  inside: string | 'body';
  lining: string | None;
  backBar: string | None;
  outline: boolean;
}

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
  number: JerseySpec['number'];
  // Empty when the jersey carries no mark.
  marks: readonly JerseyMarkUse[];
}

export interface CompletePantsSpec {
  body: string;
  stripes: (CompleteStripeStack & { position: 'center' | 'leg-edge' }) | None;
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
  const spec: JerseySpec = {
    body: c.body,
    collar: {
      style: collar.style,
      ...(collar.color !== 'none' && { color: collar.color }),
      ...(collar.trim !== 'none' && { trim: collar.trim }),
      ...(collar.inside !== 'body' && { inside: collar.inside }),
      ...(collar.lining !== 'none' && { lining: collar.lining }),
      ...(collar.backBar !== 'none' && { backBar: collar.backBar }),
      outline: collar.outline,
    },
    number: c.number,
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
  };
}

export function socksSpecOf(c: CompleteSocksSpec): SocksSpec {
  const stripes = given(c.stripes);
  return { color: c.color, ...(stripes && { stripes: stack(stripes) }) };
}

export type SpecSurface = 'jersey' | 'pants' | 'socks' | 'helmet';

type CollarPath = `collar.${keyof CompleteCollar}`;

// One question per field, asked of the reference during authoring. Keyed by the complete type's
// fields, so adding a field without a question is a type error.
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
  number: 'What are the chest numeral fill, outline colour and outline weight?',
  marks: 'Which logos or wordmarks appear on the sleeves, shoulders or chest?',
};

const PANTS_QUESTIONS: Record<keyof CompletePantsSpec, string> = {
  body: 'What colour are the pants?',
  stripes: 'Is there a leg stripe, where does it sit, and is it piped?',
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

function has(value: unknown, path: string): boolean {
  let at: unknown = value;
  for (const key of path.split('.')) {
    if (typeof at !== 'object' || at === null || !Object.hasOwn(at, key)) return false;
    at = (at as Record<string, unknown>)[key];
  }
  return at !== undefined;
}

// Checklist paths a (JSON) spec leaves out, in question-table order.
export function findMissing(surface: SpecSurface, value: unknown): string[] {
  return Object.keys(QUESTIONS[surface]).filter((path) => !has(value, path));
}

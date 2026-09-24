// A declarative helmet: shell and facemask colours, the shell's existing art as a placed mark, and
// the side numeral. expandHelmet() emits an ordinary UniformPart; the art is never re-fitted.
import type { PlacedMark } from './marks';
import type { PartLayer, UniformPart } from './parts';
import { HELMET_NUMBER_PATH } from './shared';

export interface HelmetSpec {
  shell: string;
  // A palette key, or 'neutral' for the shared grey cage.
  facemask: string | 'neutral';
  // The shell's art, crown stripes included.
  decal: PlacedMark | 'none';
  number: { fill: string } | 'none';
}

const expanded = new WeakSet<UniformPart>();

export function expandHelmet(prefix: string, spec: HelmetSpec): UniformPart {
  const layers: PartLayer[] = spec.decal === 'none' ? [] : spec.decal.layers.map((l) => ({ ...l }));
  if (spec.number !== 'none') {
    layers.push({
      id: `${prefix}-number`,
      surface: 'helmet',
      d: HELMET_NUMBER_PATH,
      clip: true,
      kind: 'fill',
      fill: spec.number.fill,
    });
  }
  const part: UniformPart = {
    base: spec.shell,
    ...(spec.facemask !== 'neutral' && { facemask: spec.facemask }),
    layers,
  };
  expanded.add(part);
  return part;
}

// True only for a part expandHelmet() returned.
export function isExpandedHelmet(part: UniformPart): boolean {
  return expanded.has(part);
}

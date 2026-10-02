// Los Angeles' own construction layers, bound to palette keys. Each export is a placed mark,
// emitted exactly as written.
import {
  CHARGERS_BOLT_BODY_LEFT,
  CHARGERS_BOLT_BODY_RIGHT,
  CHARGERS_BOLT_KEYLINE_LEFT,
  CHARGERS_BOLT_KEYLINE_RIGHT,
  CHARGERS_DECAL_BOLT_PATH,
  CHARGERS_DECAL_KEYLINE_PATH,
  CHARGERS_NAVY_BOLT_BODY_LEFT,
  CHARGERS_NAVY_BOLT_BODY_RIGHT,
  CHARGERS_NAVY_BOLT_GAP_LEFT,
  CHARGERS_NAVY_BOLT_GAP_RIGHT,
  CHARGERS_NAVY_BOLT_KEYLINE_LEFT,
  CHARGERS_NAVY_BOLT_KEYLINE_RIGHT,
} from './paths';
import { placed, type PlacedMark } from '../../core/marks';
import type { PartLayer } from '../../core/parts';
import type { UniformSurface } from '../../core/types';

const fill = (id: string, surface: UniformSurface, d: string, color: string): PartLayer => ({
  id,
  surface,
  d,
  clip: true,
  kind: 'fill',
  fill: color,
});

// The sleeve bolts: keyline first, body over it, the left sleeve before the right in each pair.
export function chargersSleeveBolts(keyline: string, body: string): PlacedMark {
  return placed([
    fill('chargers-bolt-keyline-left', 'sleeve-left', CHARGERS_BOLT_KEYLINE_LEFT, keyline),
    fill('chargers-bolt-keyline-right', 'sleeve-right', CHARGERS_BOLT_KEYLINE_RIGHT, keyline),
    fill('chargers-bolt-body-left', 'sleeve-left', CHARGERS_BOLT_BODY_LEFT, body),
    fill('chargers-bolt-body-right', 'sleeve-right', CHARGERS_BOLT_BODY_RIGHT, body),
  ]);
}

// The shell's large bolt: a keyline under the body.
export function chargersHelmetDecal(keyline: string, body: string): PlacedMark {
  return placed([
    fill('chargers-decal-keyline', 'helmet', CHARGERS_DECAL_KEYLINE_PATH, keyline),
    fill('chargers-decal-bolt', 'helmet', CHARGERS_DECAL_BOLT_PATH, body),
  ]);
}

const NAVY_BOLT_PAINT = ['gold', 'navy', 'white'];

// The navy alternate's sleeve bolts: white body inside a navy gap and a narrow gold edge, painted
// outermost first, the left sleeve before the right.
export function chargersNavySleeveBolts(): PlacedMark {
  const side = (surface: 'sleeve-left' | 'sleeve-right', paths: readonly string[]) =>
    paths.map((d, index) =>
      fill(`chargers-navy-bolt-${index}-${surface.slice(7)}`, surface, d, NAVY_BOLT_PAINT[index])
    );
  return placed([
    ...side('sleeve-left', [
      CHARGERS_NAVY_BOLT_KEYLINE_LEFT,
      CHARGERS_NAVY_BOLT_GAP_LEFT,
      CHARGERS_NAVY_BOLT_BODY_LEFT,
    ]),
    ...side('sleeve-right', [
      CHARGERS_NAVY_BOLT_KEYLINE_RIGHT,
      CHARGERS_NAVY_BOLT_GAP_RIGHT,
      CHARGERS_NAVY_BOLT_BODY_RIGHT,
    ]),
  ]);
}

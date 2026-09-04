import type { ColorRef, TeamUniformDefinition, UniformLayer } from './types';

// Las Vegas' two archived kits, read off the Gridiron Uniform Database 2025 composite in
// nfl-uniform-refs/raiders (home is that sheet's row-1 figure 1, away its row-2 figure 1).
//
// This module carries no layers, and that is the measurement, not a shortcut. A column down the
// sleeve of the home figure (jersey top y=133, sleeve hem y=199) runs unbroken black from the
// shoulder to the hem; the pants are unbroken silver; the collar carries no contrast trim. The only
// non-body marks on the reference are the shoulder numerals and the sleeve patch, both of which are
// out of scope everywhere. So both kits are the stripped generic model plus three color choices,
// which is exactly what this club's uniform is.
//
// Provenance: contour trace of the club's mark from the GUD composite — a reproduction
// of a third-party mark, not original geometry. The mark is NON-FREE upstream
// (Wikimedia `File:Las Vegas Raiders logo.svg`, fair use; trademarked). Licence audit: the vault’s
// Decisions.md, 2026-09-03.
//
// The shield, traced from the home figure's shell (bbox x33-188, y29-149 in the reference — a GIF,
// normalized to RGB first) mapped onto the raw helmet space at ~6.25x. Three plain-union fills:
// white keyline, black shield, and the pirate's face.
//
// This module used to say the mark had "no solid region to carry it". That was a fair description
// of the pirate and the crossed swords and a wrong description of the mark, which is mostly a solid
// black shield about 28x29 reference px — comfortably above the floor and cleanly separable from
// the silver shell. Judging a mark by its most detailed feature rather than by what it is mostly
// made of is how this archive lost four other decals; see the brief's §6.
//
// WHAT IS GENUINELY DROPPED is the interior: the "RAIDERS" wordmark (out of scope everywhere) and
// the crossed swords, which are sub-2px at this size. The pirate's face survives as a single ~7x6px
// component and is authored as one blob rather than as features. At swatch scale the shield and its
// keyline are what identify the mark; at 4x the face reads as a smudge, which is honest — it is a
// trace of something too small to resolve, not an invention.
export const RAIDERS_DECAL_KEYLINE_PATH =
  'M453.4,183.0 L453.4,189.3 L463.4,196.1 L478.0,200.3 L509.0,199.1 L511.8,201.6 L511.8,257.4 L506.9,279.4 L503.3,286.6 L504.7,295.9 L500.4,296.8 L494.7,310.7 L486.5,323.0 L472.6,338.6 L465.5,342.4 L467.3,347.9 L462.7,344.5 L450.2,350.9 L425.6,352.2 L416.7,356.8 L413.8,353.0 L413.8,346.2 L415.6,346.2 L414.5,350.9 L418.1,353.9 L422.0,353.0 L422.4,347.5 L435.2,347.1 L406.7,327.2 L405.6,321.7 L400.3,315.4 L391.4,297.2 L382.1,264.2 L378.9,217.7 L380.0,198.6 L382.5,196.5 L389.6,200.3 L415.2,199.9 L432.0,194.8 L444.1,185.1 L450.5,185.5 L453.0,183.4 Z';
export const RAIDERS_DECAL_SHIELD_PATH =
  'M443.8,197.4 L449.5,197.8 L453.4,202.0 L464.8,207.5 L485.8,210.9 L483.7,223.2 L487.3,229.5 L494.7,225.7 L492.2,218.9 L493.7,210.9 L502.2,209.6 L505.1,213.4 L501.5,264.6 L492.2,296.3 L484.4,311.1 L466.9,331.9 L447.7,342.4 L442.7,342.0 L426.3,332.3 L414.2,320.9 L405.3,306.9 L392.4,273.1 L387.8,241.8 L388.9,208.4 L401.7,210.1 L399.2,215.6 L398.9,224.9 L401.0,228.7 L406.3,228.7 L411.3,220.2 L407.1,210.5 L427.7,207.5 L443.4,197.8 Z';
export const RAIDERS_DECAL_FACE_PATH =
  'M431.3,267.2 L444.5,268.4 L451.3,280.7 L459.8,277.7 L459.8,293.4 L449.5,306.9 L440.6,307.3 L434.9,301.8 L434.9,293.8 L429.9,288.3 L429.9,284.9 L443.8,284.5 L444.8,275.2 L440.9,271.8 L432.0,271.4 L429.9,268.8 L430.9,267.6 Z';

// Fixed art: black on white on both silver shells, so nothing here takes a token.
function decal(): UniformLayer[] {
  return (
    [
      ['raiders-decal-keyline', RAIDERS_DECAL_KEYLINE_PATH, '#FFFFFF'],
      ['raiders-decal-shield', RAIDERS_DECAL_SHIELD_PATH, '#000000'],
      ['raiders-decal-face', RAIDERS_DECAL_FACE_PATH, '#FFFFFF'],
    ] as [string, string, ColorRef][]
  ).map(([id, d, fill]) => ({
    id,
    surface: 'helmet' as const,
    d,
    clip: true,
    kind: 'fill' as const,
    fill,
  }));
}
//
// Out of scope on both kits: the chest wordmark, the league shield, and the shoulder numerals.

const GENERIC_STRIPPED = [
  'generic-helmet-stripe',
  'generic-sleeve-yoke-left',
  'generic-sleeve-yoke-right',
  'generic-sleeve-stripe-left',
  'generic-sleeve-stripe-right',
  'generic-collar',
  'generic-pants-stripe-left',
  'generic-pants-stripe-right',
];

export const RAIDERS_UNIFORMS: TeamUniformDefinition = {
  teamId: 'raiders',
  defaults: { removeLayerIds: GENERIC_STRIPPED },
  kits: {
    // Black body, silver shell and silver pants. Silver is both secondary and accent here (ESPN
    // supplies only two colors), so every silver surface resolves from `secondary`. The numerals are
    // silver with no separate keyline, so the outline is set to the face color rather than left to
    // inherit the generic model's contrasting stroke.
    home: {
      helmetColor: 'secondary',
      pantsColor: 'secondary',
      layers: decal(),
      number: { fill: 'secondary', outline: 'secondary', outlineWidth: 10 },
    },
    // White body under the same silver shell and pants. The away palette moves white into primary
    // and black into secondary, so silver is only reachable through `accent` and the numerals —
    // black on white — take `secondary`.
    away: {
      helmetColor: 'accent',
      pantsColor: 'accent',
      layers: decal(),
      number: { fill: 'secondary', outline: 'secondary', outlineWidth: 10 },
    },
  },
};

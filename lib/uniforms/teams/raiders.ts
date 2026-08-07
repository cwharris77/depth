import type { TeamUniformDefinition } from './types';

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
// The shell is left bare. The club's mark is a helmeted pirate head over crossed swords — fine
// linework at every scale in the reference, with no solid region to carry it, so it fails the same
// test the Seahawks keyline and the Falcons falcon failed.
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
      number: { fill: 'secondary', outline: 'secondary', outlineWidth: 10 },
    },
    // White body under the same silver shell and pants. The away palette moves white into primary
    // and black into secondary, so silver is only reachable through `accent` and the numerals —
    // black on white — take `secondary`.
    away: {
      helmetColor: 'accent',
      pantsColor: 'accent',
      number: { fill: 'secondary', outline: 'secondary', outlineWidth: 10 },
    },
  },
};

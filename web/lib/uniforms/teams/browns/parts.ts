// Cleveland authored as composable parts. This file restates WHICH parts each kit combines, and
// names every color from the team palette instead of the kit row's shifting
// primary/secondary/accent. The jerseys themselves are specs under ./jerseys/.
//
// Cleveland's construction is defined by what it does NOT have: the shell carries no logo and no
// center stripe, the V-collar carries no trim, and the numerals carry no keyline. Everything the
// uniform says, it says with one five-band stripe stack on each sleeve and a three-band pant
// stripe. The current composite's brown, orange and white pants are independently selectable;
// the 1946 throwback keeps its existing white pants outside that current-uniform option set.

import { expandHelmet } from '../core/helmet-spec';
import { expandSocks } from '../core/pants-spec';
import { type PartLayer, type UniformPart } from '../core/parts';

// The 2025 composite's white and orange pants both carry the same orange-brown-orange stripe.
// The shared mannequin band supplies the 16-unit orange outer field; a six-unit brown centre leaves
// equal orange rails on each side. These are full front-leg bands, unlike side-seam-only details.
function pantsStripes(): PartLayer[] {
  return [
    {
      id: 'generic-pants-stripe-left',
      surface: 'leg-left',
      d: 'M118,807 H134 V1196 H118 Z',
      clip: true,
      kind: 'fill',
      fill: 'orange',
    },
    {
      id: 'generic-pants-stripe-right',
      surface: 'leg-right',
      d: 'M454,807 H470 V1196 H454 Z',
      clip: true,
      kind: 'fill',
      fill: 'orange',
    },
    {
      id: 'browns-pants-stripe-center-left',
      surface: 'leg-left',
      d: 'M123,807 H129 V1196 H123 Z',
      clip: true,
      kind: 'fill',
      fill: 'brown',
    },
    {
      id: 'browns-pants-stripe-center-right',
      surface: 'leg-right',
      d: 'M459,807 H465 V1196 H459 Z',
      clip: true,
      kind: 'fill',
      fill: 'brown',
    },
  ];
}

// The bare orange shell — the club is the only one in the league with a bare helmet — shared by
// home and away.
//
// White cage. The bare orange shell wears the SF2BD-SW-SP white mask (named sources). The white
// cage reads cleanly against the orange shell.
const HELMET_ORANGE: UniformPart = expandHelmet('browns-orange-helmet', {
  shell: 'orange',
  facemask: 'white',
  decal: 'none',
  number: 'none',
});

// The 1946 throwback's brown shell (the era's documented leather helmet), inferred — NOT in the
// 2025 composite.
//
// White cage. The modern reproduction of the 1946 shell wears the same SF2BD-SW-SP white mask.
const HELMET_BROWN: UniformPart = expandHelmet('browns-brown-helmet', {
  shell: 'brown',
  facemask: 'white',
  decal: 'none',
  number: 'none',
});

// White (P1) and orange (P2) pants: the 2025 composite gives both the same
// orange-brown-orange full-leg band.
const PANTS_WHITE: UniformPart = { base: 'white', layers: pantsStripes() };
const PANTS_ORANGE: UniformPart = { base: 'orange', layers: pantsStripes() };

// Brown pants (P3): the 2025 color-rush figure is unstriped.
const PANTS_BROWN: UniformPart = { base: 'brown', layers: [] };

// The 1946 throwback is not represented in the current composite, so retain its existing
// unstriped white pant construction rather than importing an option from a different uniform era.
const PANTS_1946_WHITE: UniformPart = { base: 'white', layers: [] };

const SOCKS_BROWN = expandSocks('browns-brown-socks', {
  color: 'brown',
  stripes: {
    bands: [
      { color: 'white', size: 's' },
      { color: 'orange', size: 's' },
      { color: 'white', size: 's' },
    ],
    gap: 'none',
  },
});

const SOCKS_WHITE = expandSocks('browns-white-socks', {
  color: 'white',
  stripes: {
    bands: [
      { color: 'brown', size: 's' },
      { color: 'orange', size: 's' },
      { color: 'brown', size: 's' },
    ],
    gap: 'none',
  },
});

const SOCKS_1946_WHITE = expandSocks('browns-1946-white-socks', { color: 'white' });

export const BROWNS_CONSTRUCTION = {
  teamId: 'browns',
  // Jersey hexes from the curated rows. Brown and orange are the two physical
  // colors carried in different primary/secondary/accent slots per row; white is the pants/numerals
  // literal (no white token on the home row).
  palette: {
    brown: '#311D00',
    orange: '#FF3C00',
    white: '#FFFFFF',
  },
  helmets: { orange: HELMET_ORANGE, brown: HELMET_BROWN },
  pants: {
    white: PANTS_WHITE,
    orange: PANTS_ORANGE,
    brown: PANTS_BROWN,
    '1946-white': PANTS_1946_WHITE,
  },
  socks: { brown: SOCKS_BROWN, white: SOCKS_WHITE, '1946-white': SOCKS_1946_WHITE },
  kits: {
    home: {
      helmet: 'orange',
      jersey: 'brown',
      pants: ['white', 'orange', 'brown'],
      socks: 'brown',
    },
    away: { helmet: 'orange', jersey: 'white', pants: ['white', 'orange'], socks: 'white' },
    '1946-throwback': {
      helmet: 'brown',
      jersey: 'white',
      pants: '1946-white',
      socks: '1946-white',
    },
  },
};

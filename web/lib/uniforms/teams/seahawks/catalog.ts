import type { TeamCatalog } from '../core/catalog';

export const SEAHAWKS_CATALOG: TeamCatalog = {
  teamId: 'seahawks',
  designs: [
    {
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'navy',
      colors: { primary: '#002244', secondary: '#69BE28', accent: '#A5ACAF' },
      legacyAccent: { uiAccent: '#69BE28', onAccent: '#0a0e1a' },
      periods: [{ from: 2012 }],
      combinations: [{ key: 'standard', label: 'Standard', helmet: 'navy-hawk', pants: 'navy' }],
    },
    // Seahawks royal/green/silver throwback — the 1976–2001 look, reintroduced as an active
    // throwback in 2023, so is_current: true despite the historical era. No published codes exist
    // for the modern remake; hexes are the reference sheet's flat fills. uiAccent brightens the
    // green so it reads on the dark UI.
    {
      slug: '1976-throwback',
      name: 'Throwback',
      kind: 'throwback',
      jersey: 'throwback',
      colors: { primary: '#0248B3', secondary: '#0E8329', accent: '#A7B0BA' },
      legacyAccent: { uiAccent: '#3DB06A', onAccent: '#0a0e1a' },
      periods: [{ from: 1976 }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'throwback-silver', pants: 'throwback' },
      ],
    },
    {
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#002244', accent: '#69BE28' },
      legacyAccent: { uiAccent: '#69BE28', onAccent: '#0a0e1a' },
      periods: [{ from: 2012 }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'navy-hawk', pants: 'white-plain' },
      ],
    },
    // Seahawks 2025 Rivalries. primary is the wolf-grey body the jersey and pants share; accent is
    // the muted pine of the print, not action green. uiAccent is the grey body because both the
    // pine (2.41) and the kit's teal shell (1.57) fail AA against the dark UI background — see the
    // contrast tests in lib/__tests__/uniforms.test.ts.
    {
      slug: 'rivalries-2025',
      name: 'Rivalries',
      kind: 'alternate',
      jersey: 'rivalries-silver',
      colors: { primary: '#AFB3B5', secondary: '#002244', accent: '#29594C' },
      legacyAccent: { uiAccent: '#AFB3B5', onAccent: '#0a0e1a' },
      periods: [{ from: 2025 }],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'teal-hawk',
          pants: 'rivalries-silver',
          socks: 'navy',
        },
      ],
    },
    // Seahawks Action Green Color Rush, first worn in 2016 and still in rotation (last worn 2024).
    // The fabric is a brighter lime than the brand's Action Green and has no published code, so
    // primary is the reference sheet's flat fill; navy is the band, numerals and pant stripe.
    {
      slug: 'color-rush',
      name: 'Color Rush',
      kind: 'color-rush',
      jersey: 'action-green',
      colors: { primary: '#B6FF3E', secondary: '#002244', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#B6FF3E', onAccent: '#15161a' },
      periods: [{ from: 2016 }],
      combinations: [
        { key: 'standard', label: 'Standard', helmet: 'navy-hawk', pants: 'action-green' },
      ],
    },
  ],
};

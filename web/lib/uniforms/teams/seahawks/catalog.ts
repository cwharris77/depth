import type { TeamCatalog } from '../core/catalog';

export const SEAHAWKS_CATALOG: TeamCatalog = {
  teamId: 'seahawks',
  designs: [
    {
      id: 'seahawks-home-2012',
      slug: 'home',
      name: 'Home',
      kind: 'home',
      jersey: 'navy',
      colors: { primary: '#002244', secondary: '#69BE28', accent: '#A5ACAF' },
      legacyAccent: { uiAccent: '#69BE28', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2012,
          startSource:
            'https://www.seahawks.com/news/on-this-date-kam-chancellor-models-seahawks-new-uniforms-155291',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'navy-hawk',
          pants: 'navy',
          pantsNike: 'green',
          socks: 'navy',
        },
        {
          key: 'grey-pants',
          label: 'Grey pants',
          helmet: 'navy-hawk',
          pants: 'grey',
          pantsNike: 'navy',
          socks: 'navy',
        },
      ],
    },
    // Seahawks royal/green/silver throwback — the 1976–2001 look, reintroduced as an active
    // throwback in 2023, so is_current: true despite the historical era. No published codes exist
    // for the modern remake; hexes are the reference sheet's flat fills. uiAccent brightens the
    // green so it reads on the dark UI.
    {
      id: 'seahawks-1976-throwback-1976',
      slug: '1976-throwback',
      name: 'Throwback',
      kind: 'throwback',
      jersey: 'throwback',
      colors: { primary: '#0248B3', secondary: '#0E8329', accent: '#A7B0BA' },
      legacyAccent: { uiAccent: '#3DB06A', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2023,
          startSource: 'https://www.seahawks.com/news/2023-week-8-seahawks-browns-uniform-combo',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'throwback-silver',
          pants: 'throwback',
          pantsNike: 'throwbackRoyal',
        },
      ],
    },
    {
      id: 'seahawks-away-2012',
      slug: 'away',
      name: 'Away',
      kind: 'away',
      jersey: 'white',
      colors: { primary: '#FFFFFF', secondary: '#002244', accent: '#69BE28' },
      legacyAccent: { uiAccent: '#69BE28', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2012,
          startSource:
            'https://www.seahawks.com/news/on-this-date-kam-chancellor-models-seahawks-new-uniforms-155291',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'navy-hawk',
          pants: 'white-plain',
          pantsNike: 'navy',
          socks: 'navy',
        },
        {
          key: 'grey-pants',
          label: 'Grey pants',
          helmet: 'navy-hawk',
          pants: 'grey',
          pantsNike: 'navy',
          socks: 'navy',
        },
        {
          key: 'grey-pants-white-socks',
          label: 'Grey pants, white socks',
          helmet: 'navy-hawk',
          pants: 'grey',
          pantsNike: 'navy',
          socks: 'white',
        },
        {
          key: 'navy-pants',
          label: 'Navy pants',
          helmet: 'navy-hawk',
          pants: 'navy',
          pantsNike: 'green',
          socks: 'navy',
        },
        {
          key: 'navy-pants-white-socks',
          label: 'Navy pants, white socks',
          helmet: 'navy-hawk',
          pants: 'navy',
          pantsNike: 'green',
          socks: 'white',
        },
        {
          key: 'white-socks',
          label: 'White socks',
          helmet: 'navy-hawk',
          pants: 'white-plain',
          pantsNike: 'navy',
          socks: 'white',
        },
      ],
    },
    // Seahawks 2025 Rivalries. primary is the wolf-grey body the jersey and pants share; accent is
    // the muted pine of the print, not action green. uiAccent is the grey body because both the
    // pine (2.41) and the kit's teal shell (1.57) fail AA against the dark UI background — see the
    // contrast tests in lib/__tests__/uniforms.test.ts.
    {
      id: 'seahawks-rivalries-2025-2025',
      slug: 'rivalries-2025',
      name: 'Rivalries',
      kind: 'alternate',
      jersey: 'rivalries-silver',
      colors: { primary: '#AFB3B5', secondary: '#002244', accent: '#29594C' },
      legacyAccent: { uiAccent: '#AFB3B5', onAccent: '#0a0e1a' },
      periods: [
        {
          from: 2025,
          startSource:
            'https://www.seahawks.com/news/seahawks-to-debut-rivalries-uniforms-in-week-16-vs-l-a-rams',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'teal-hawk',
          pants: 'rivalries-silver',
          pantsNike: 'rivalriesJerseyNavy',
          socks: 'navy',
        },
      ],
    },
    // Seahawks Action Green Color Rush, first worn in 2016 and still in rotation (last worn 2024).
    // The fabric is a brighter lime than the brand's Action Green and has no published code, so
    // primary is the reference sheet's flat fill; navy is the band, numerals and pant stripe.
    {
      id: 'seahawks-color-rush-2016',
      slug: 'color-rush',
      name: 'Color Rush',
      kind: 'color-rush',
      jersey: 'action-green',
      colors: { primary: '#B6FF3E', secondary: '#002244', accent: '#FFFFFF' },
      legacyAccent: { uiAccent: '#B6FF3E', onAccent: '#15161a' },
      periods: [
        {
          from: 2016,
          startSource:
            'https://www.seahawks.com/news/seahawks-to-wear-action-green-for-2022-opener-vs-broncos',
          verifiedOn: '2026-10-12',
        },
      ],
      combinations: [
        {
          key: 'standard',
          label: 'Standard',
          helmet: 'navy-hawk',
          pants: 'action-green',
          pantsNike: 'navy',
          socks: 'green',
        },
        {
          key: 'navy-pants',
          label: 'Navy pants',
          helmet: 'navy-hawk',
          pants: 'navy',
          pantsNike: 'green',
          socks: 'navy',
        },
      ],
    },
  ],
};

export const referencePacket = {
  classification: 'signature',
  sources: [
    {
      url: 'https://www.therams.com/photos/game-action-rams-vs-broncos-week-3-empower-field-at-mile-high-2026',
      role: 'dated-game',
      covers: ['white pants with Sol and royal stripes', 'white socks', 'worn away construction'],
    },
    {
      url: 'https://www.therams.com/photos/uniform-photos-rams-unveil-2026-primary-uniform-updates',
      role: 'front-and-detail',
      covers: [
        'full spiral sleeve horns',
        'flat Sol home numerals',
        'blue away numerals with Sol keyline',
        'Sol shoulder panels on white',
        'unchanged primary helmet',
      ],
    },
    {
      url: 'https://www.therams.com/news/rams-unveil-uniform-brand-refresh-ahead-of-2026-season',
      role: 'design-description',
      covers: [
        'full spiral sleeve horns',
        'flat Sol home numerals',
        'blue away numerals with Sol keyline',
        'Sol shoulder panels on white',
        'unchanged primary helmet',
      ],
    },
  ],
  observed: [
    'full spiral sleeve horns',
    'flat Sol home numerals',
    'blue away numerals with Sol keyline',
    'Sol shoulder panels on white',
    'unchanged primary helmet',
  ],
  approximations: [
    'The shared athletic numeral is retained in place of the club-specific number font.',
  ],
} as const;

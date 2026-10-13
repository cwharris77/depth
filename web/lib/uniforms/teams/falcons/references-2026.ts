export const referencePacket = {
  classification: 'detail',
  sources: [
    {
      url: 'https://www.atlantafalcons.com/uniforms/',
      role: 'front-and-detail',
      covers: [
        'red home and white away',
        'falcon sleeve logos',
        'contrasting shoulder numerals',
        'silver-edged pants stripes',
        'Falcons and Atlanta chest wordmarks',
      ],
    },
    {
      url: 'https://www.atlantafalcons.com/news/authentic-fast-timeless-atlanta-falcons-unveil-new-uniforms',
      role: 'design-description',
      covers: [
        'red home and white away',
        'falcon sleeve logos',
        'contrasting shoulder numerals',
        'silver-edged pants stripes',
        'Falcons and Atlanta chest wordmarks',
      ],
    },
  ],
  observed: [
    'red home and white away',
    'falcon sleeve logos',
    'contrasting shoulder numerals',
    'silver-edged pants stripes',
    'Falcons and Atlanta chest wordmarks',
  ],
  approximations: [
    'The shared athletic numeral is retained in place of the club-specific number font.',
    'Chest lettering is outlined from the pinned condensed font.',
  ],
} as const;

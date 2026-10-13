export const referencePacket = {
  classification: 'signature',
  sources: [
    {
      url: 'https://www.baltimoreravens.com/the-next-flight/',
      role: 'front-and-detail',
      covers: [
        'wing collar',
        'midnight purple numeral outline',
        'heraldic sleeve shields',
        'diagonally cut talon stripes',
        'Ravens and Baltimore chest wordmarks',
      ],
    },
    {
      url: 'https://www.baltimoreravens.com/news/baltimore-ravens-unveil-new-uniforms-press-release',
      role: 'design-description',
      covers: [
        'wing collar',
        'midnight purple numeral outline',
        'heraldic sleeve shields',
        'diagonally cut talon stripes',
        'Ravens and Baltimore chest wordmarks',
      ],
    },
  ],
  observed: [
    'wing collar',
    'midnight purple numeral outline',
    'heraldic sleeve shields',
    'diagonally cut talon stripes',
    'Ravens and Baltimore chest wordmarks',
    'round numerals',
    'purple sleeve hem on white',
  ],
  approximations: [
    'The round numeral is outlined from the pinned DIN face, not the club-specific number font.',
    'Iridescence is represented by a fixed midnight-purple paint.',
    'The sleeve shield keeps its quarters and letters with simplified heraldic detail and no banner lettering.',
    'Chest lettering is outlined from the pinned Copperplate face.',
  ],
} as const;

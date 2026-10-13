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
  ],
  approximations: [
    'The shared athletic numeral is retained in place of the club-specific number font.',
    'Iridescence is represented by a fixed midnight-purple paint.',
    'The small sleeve shield retains its quartered field and letters with simplified heraldic detail.',
    'Chest lettering is outlined from the pinned condensed font.',
  ],
} as const;

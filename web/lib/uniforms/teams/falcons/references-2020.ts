export const referencePacket = {
  classification: 'signature',
  sources: [
    {
      url: 'https://www.atlantafalcons.com/photos/new-drip-atlanta-falcons-unveil-new-uniforms',
      role: 'front-and-detail',
      covers: ['red-to-black torso fade', 'red ATL on black and white', 'white ATL on gradient'],
    },
    {
      url: 'https://www.atlantafalcons.com/photos/best-of-the-gradient-uniforms-best-of-2020',
      role: 'game-front',
      covers: ['gradient in game use', 'black lower torso'],
    },
  ],
  observed: ['red shoulders fade to a black hem', 'ATL lettering above chest numerals'],
  approximations: [
    'The continuous fade uses published red and black endpoints; its vertical extent approximates the photographed garment.',
    'ATL is outlined from Copperplate Bold with adjusted width; the custom letter terminals are approximated.',
  ],
} as const;

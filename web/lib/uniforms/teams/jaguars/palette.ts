import { JAGUARS_DECAL_PATHS } from './marks/decal';

export const JAGUARS_PALETTE = {
  teal: '#006778',
  gold: '#D7A22A',
  throwbackGold: '#D7A22A',
  black: '#101820',
  white: '#FFFFFF',
  ...Object.fromEntries(JAGUARS_DECAL_PATHS.map(({ fill }) => [fill, fill])),
};

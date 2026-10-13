// The quartered sleeve shield in its own 100x120 space: a bordered black shield with the B and R
// on gold in opposite quarters, the black-and-gold pales and the red-and-white quarters.
import { ANCHORS, placed, placeMark, type Mark, type PlacedMark } from '../../core/marks';
import { SHIELD_B, SHIELD_R } from './wordmarks-2026';

// The box is wider than the art, more so on the sleeve's outer side, so the shield sits clear of
// the sleeve's outer edge at about four fifths of the anchor's width.
const PAD_INNER = 4;
const PAD_OUTER = 20;
const SHIELD: Mark = {
  box: [-PAD_INNER, 0, 100 + PAD_OUTER, 120],
  paths: [
    { slot: 'border', d: 'M2,8 Q50,0 98,8 L98,64 Q98,100 50,120 Q2,100 2,64 Z' },
    { slot: 'black', d: 'M7,12 Q50,5 93,12 L93,63 Q93,96 50,114 Q7,96 7,63 Z' },
    {
      slot: 'gold',
      d: 'M12,32 L48.5,32 L48.5,62.5 L12,62.5 Z M51.5,32 L88,32 L88,62.5 L51.5,62.5 Z M51.5,65.5 L88,65.5 Q88,92 51.5,108 Z',
    },
    // Six pales, counterchanged across the middle of the quarter.
    {
      slot: 'black',
      d: 'M57.6,32 L63.7,32 L63.7,47.2 L57.6,47.2 Z M69.8,32 L75.8,32 L75.8,47.2 L69.8,47.2 Z M81.9,32 L88,32 L88,47.2 L81.9,47.2 Z M51.5,47.2 L57.6,47.2 L57.6,62.5 L51.5,62.5 Z M63.7,47.2 L69.8,47.2 L69.8,62.5 L63.7,62.5 Z M75.8,47.2 L81.9,47.2 L81.9,62.5 L75.8,62.5 Z',
    },
    { slot: 'white', d: 'M12,65.5 L48.5,65.5 L48.5,108 Q12,92 12,65.5 Z' },
    {
      slot: 'red',
      d: 'M30,65.5 L48.5,65.5 L48.5,85 L30,85 Z M13.5,85 L30,85 L30,99.5 Q17,94 13.5,85 Z',
    },
    { slot: 'black', d: SHIELD_B },
    { slot: 'black', d: SHIELD_R },
  ],
};

// The shift that puts the right sleeve's shield the same distance from the left sleeve's outer
// edge.
export const SHIELD_SHIFT =
  ANCHORS['sleeve-left'].x0 -
  ANCHORS['sleeve-right'].x0 +
  ((PAD_OUTER - PAD_INNER) * ANCHORS['sleeve-right'].w) / (100 + PAD_INNER + PAD_OUTER);

// The shield on both sleeves. The left one is the right one shifted across, not mirrored, so
// its lettering and quarters keep their reading direction. `border` is null where the border
// matches the body.
export function ravensSleeveShields(idPrefix: string, border: string | null): PlacedMark {
  const right = placeMark(idPrefix, SHIELD, 'sleeve-right', {
    border,
    black: 'black',
    gold: 'gold',
    white: 'white',
    red: 'red',
  });
  return placed(
    right.flatMap((layer) => [
      {
        ...layer,
        id: layer.id.replace('-right', '-left'),
        surface: 'sleeve-left' as const,
        d: layer.d.replace(
          /(-?\d+(?:\.\d+)?),/g,
          (_, x) => `${(Number(x) + SHIELD_SHIFT).toFixed(1)},`
        ),
      },
      layer,
    ])
  );
}

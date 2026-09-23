import * as parts from '../parts';
import type { UniformPart } from '../../core/parts';

export const JERSEY_CRUSH: UniformPart = {
  base: 'crushOrange',
  layers: [
    parts.fill(
      'broncos-crush-band-top-left',
      'sleeve-left',
      parts.BRONCOS_CRUSH_BAND_TOP_LEFT,
      'royal'
    ),
    parts.fill(
      'broncos-crush-band-top-right',
      'sleeve-right',
      parts.BRONCOS_CRUSH_BAND_TOP_RIGHT,
      'royal'
    ),
    parts.fill(
      'broncos-crush-band-mid-left',
      'sleeve-left',
      parts.BRONCOS_CRUSH_BAND_MID_LEFT,
      'white'
    ),
    parts.fill(
      'broncos-crush-band-mid-right',
      'sleeve-right',
      parts.BRONCOS_CRUSH_BAND_MID_RIGHT,
      'white'
    ),
    parts.fill(
      'broncos-crush-band-low-left',
      'sleeve-left',
      parts.BRONCOS_CRUSH_BAND_LOW_LEFT,
      'royal'
    ),
    parts.fill(
      'broncos-crush-band-low-right',
      'sleeve-right',
      parts.BRONCOS_CRUSH_BAND_LOW_RIGHT,
      'royal'
    ),
  ],
  number: { fill: 'white', outline: 'royal', outlineWidth: 14 },
};

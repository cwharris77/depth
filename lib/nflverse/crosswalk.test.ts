import { describe, it, expect } from 'vitest';
import { buildCrosswalk } from './crosswalk';

describe('buildCrosswalk', () => {
  it('maps gsis_id to espn_id for rows with both', () => {
    const map = buildCrosswalk([
      { gsis_id: '00-0033873', espn_id: '3139477', display_name: 'Patrick Mahomes' },
      { gsis_id: '00-0034796', espn_id: '4241479', display_name: 'A.J. Brown' },
    ]);
    expect(map.get('00-0033873')).toBe('3139477');
    expect(map.get('00-0034796')).toBe('4241479');
    expect(map.size).toBe(2);
  });

  it('omits rows missing espn_id', () => {
    const map = buildCrosswalk([
      { gsis_id: '00-0033873', espn_id: '', display_name: 'No ESPN id' },
      { gsis_id: '00-0034796', espn_id: '4241479', display_name: 'Has ESPN id' },
    ]);
    expect(map.has('00-0033873')).toBe(false);
    expect(map.get('00-0034796')).toBe('4241479');
  });

  it('omits rows missing gsis_id', () => {
    const map = buildCrosswalk([{ gsis_id: '', espn_id: '4241479', display_name: 'No gsis id' }]);
    expect(map.size).toBe(0);
  });

  it('keeps the first row for a duplicate gsis_id', () => {
    const map = buildCrosswalk([
      { gsis_id: '00-0033873', espn_id: 'first' },
      { gsis_id: '00-0033873', espn_id: 'second' },
    ]);
    expect(map.get('00-0033873')).toBe('first');
  });
});

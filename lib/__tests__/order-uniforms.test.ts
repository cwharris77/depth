import { describe, it, expect } from 'vitest';
import { orderUniforms } from '../roster-source.db';

// orderUniforms is the read layer's one real piece of logic: current home first, then other
// active kits by name, then retired kits newest-first with a stable id tie-break.

type Row = Parameters<typeof orderUniforms>[0][number];

function row(over: Partial<Row> & Pick<Row, 'id' | 'kind'>): Row {
  return {
    team_id: 'x',
    name: over.id,
    year_start: null,
    year_end: null,
    is_current: false,
    color_primary: '#000000',
    color_secondary: '#000000',
    color_accent: '#000000',
    ui_accent: '#ffffff',
    on_accent: '#000000',
    image_path: null,
    ...over,
  };
}

describe('orderUniforms', () => {
  it('puts the current home first, active kits by name, retired newest-first with id tie-break', () => {
    const rows = [
      row({ id: 'x-home-2020', kind: 'home', is_current: false, year_end: 2020 }),
      row({ id: 'z-home-2024', kind: 'home', is_current: false, year_end: 2024 }),
      row({ id: 'x-creamsicle', kind: 'throwback', is_current: true, name: 'Creamsicle' }),
      row({ id: 'x-home', kind: 'home', is_current: true }),
      row({ id: 'a-oldtb', kind: 'throwback', is_current: false, year_end: 2024 }),
      row({ id: 'x-away', kind: 'away', is_current: true, name: 'Away' }),
    ];

    expect(orderUniforms(rows).map((u) => u.id)).toEqual([
      'x-home', // current home always first
      'x-away', // active non-home by name: Away < Creamsicle
      'x-creamsicle',
      'a-oldtb', // retired, year_end 2024, id tie-break a- before z-
      'z-home-2024',
      'x-home-2020', // retired, older
    ]);
  });

  it('does not treat a retired home as the current-home slot', () => {
    const rows = [
      row({ id: 'x-home-2019', kind: 'home', is_current: false, year_end: 2019 }),
      row({ id: 'x-away', kind: 'away', is_current: true, name: 'Away' }),
    ];
    // No current home present -> the active away leads, retired home last.
    expect(orderUniforms(rows).map((u) => u.id)).toEqual(['x-away', 'x-home-2019']);
  });
});

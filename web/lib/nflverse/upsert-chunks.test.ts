import { describe, it, expect } from 'vitest';
import {
  upsertChunkSize,
  rowCellCount,
  MAX_UPSERT_CHUNK,
  UPSERT_CELL_BUDGET,
} from './upsert-chunks';

describe('upsertChunkSize', () => {
  it('keeps narrow rows at the row ceiling', () => {
    expect(upsertChunkSize({ a: 1, b: 2, c: 3 })).toBe(MAX_UPSERT_CHUNK);
  });

  it('shrinks a wide row to the cell budget', () => {
    const wide = Object.fromEntries(Array.from({ length: 150 }, (_, i) => [`c${i}`, i]));
    expect(upsertChunkSize(wide)).toBe(Math.floor(UPSERT_CELL_BUDGET / 150));
    expect(upsertChunkSize(wide)).toBeLessThan(MAX_UPSERT_CHUNK);
  });

  it('never returns less than a single row, however wide', () => {
    const huge = Object.fromEntries(Array.from({ length: 100_000 }, (_, i) => [`c${i}`, i]));
    expect(upsertChunkSize(huge)).toBe(1);
  });

  it('treats a non-object row as width 1', () => {
    expect(rowCellCount('scalar')).toBe(1);
    expect(rowCellCount(null)).toBe(1);
    expect(upsertChunkSize(null)).toBe(MAX_UPSERT_CHUNK);
  });
});

import { describe, it, expect } from 'vitest';
import { sqlValue, insertStatement } from '@/lib/utils/seed-sql';

describe('sqlValue', () => {
  it("escapes single quotes in strings (O'Brien)", () => {
    expect(sqlValue("O'Brien")).toBe("'O''Brien'");
  });
  it('renders null and undefined as SQL null', () => {
    expect(sqlValue(null)).toBe('null');
    expect(sqlValue(undefined)).toBe('null');
  });
  it('renders numbers and booleans bare', () => {
    expect(sqlValue(42)).toBe('42');
    expect(sqlValue(true)).toBe('true');
  });
  it('renders a non-finite number as null (never NaN in SQL)', () => {
    expect(sqlValue(NaN)).toBe('null');
  });
});

describe('insertStatement', () => {
  it('returns empty string for no rows (no dangling INSERT)', () => {
    expect(insertStatement('players', ['id'], [], 'id')).toBe('');
  });
  it('emits a multi-row on-conflict-do-nothing insert', () => {
    const sql = insertStatement(
      'teams',
      ['id', 'name'],
      [
        { id: 'sea', name: 'Seahawks' },
        { id: 'sf', name: ' 49ers' },
      ],
      'id'
    );
    expect(sql).toContain('insert into teams (id, name) values');
    expect(sql).toContain("('sea', 'Seahawks')");
    expect(sql).toContain('on conflict (id) do nothing;');
  });
  it('emits do-update-set when updateColumns is passed', () => {
    const sql = insertStatement('teams', ['id', 'name'], [{ id: 'sea', name: 'Seahawks' }], 'id', [
      'name',
    ]);
    expect(sql).toContain('on conflict (id) do update set name = excluded.name;');
  });
});

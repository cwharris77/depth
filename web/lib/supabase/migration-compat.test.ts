// Unit tests for the iOS backend-compatibility scan rules
// (lib/supabase/migration-compat.ts). The denylist is the load-bearing safety logic
// of the CI guard — these tests pin it against the real migration shapes in this
// repo (the 2026-08-24 TestFlight failure migration included) plus adversarial
// cases, so a future scan edit can't silently stop catching the dangerous class.

import { describe, expect, it } from 'vitest';
import {
  compatibilityAnnotation,
  findDestructivePatterns,
  jsonNotNullWithoutDefault,
  stripSqlComments,
} from './migration-compat';

describe('findDestructivePatterns', () => {
  it('flags the postmortem drop-column migration (2026-08-24 TestFlight failure)', () => {
    const sql = `
-- The ESPN-to-home drift reconciler is gone; its staging state has no remaining writer.
-- IF EXISTS keeps fresh resets valid after removal of the old add-column migration.
alter table teams drop column if exists pending_home_colors;
`;
    expect(findDestructivePatterns(sql)).toContain('drop column');
  });

  it('flags rename column and rename table', () => {
    expect(findDestructivePatterns('alter table teams rename column a to b;')).toContain('rename column/table');
    expect(findDestructivePatterns('alter table teams rename to franchises;')).toContain('rename column/table');
  });

  it('flags alter column type in both Postgres spellings', () => {
    expect(findDestructivePatterns('alter table teams alter column bio type text;')).toContain('alter column type');
    expect(findDestructivePatterns('alter table teams alter column bio set data type jsonb;')).toContain('alter column type');
  });

  it('flags drop constraint and drop table', () => {
    expect(findDestructivePatterns('alter table teams drop constraint teams_pkey;')).toContain('drop constraint');
    expect(findDestructivePatterns('drop table if exists legacy_players;')).toContain('drop table');
  });

  it('flags enum value removal and enum type drops', () => {
    expect(findDestructivePatterns("alter type position_kind drop value 'OT';")).toContain('enum value drop/rename');
    expect(findDestructivePatterns('drop type position_kind;')).toContain('drop type (enum)');
  });

  it('flags NOT NULL jsonb without default added to an existing table', () => {
    expect(findDestructivePatterns('alter table teams add column snapshots jsonb not null;')).toContain(
      'json/jsonb NOT NULL without default (existing table)'
    );
  });

  it('does NOT flag a NOT NULL jsonb column that carries a default', () => {
    expect(findDestructivePatterns("alter table teams add column snapshots jsonb not null default '{}'::jsonb;")).toEqual([]);
  });

  it('does NOT flag additive-only migrations', () => {
    const sql = `
-- Additive-only: new table, new nullable column, new index.
create table badges (id text primary key);
alter table teams add column badge_id text references badges(id);
create index teams_badge_idx on teams (badge_id);
insert into teams (id) values ('seahawks');
`;
    expect(findDestructivePatterns(sql)).toEqual([]);
  });

  it('ignores destructive verbs mentioned only in comments', () => {
    const sql = `
-- we should never drop column pending_home_colors; rollback plan below
select 1;
`;
    expect(findDestructivePatterns(sql)).toEqual([]);
  });

  it('does not flag CREATE TABLE with jsonb not null (a new table cannot break old clients)', () => {
    const sql = 'create table reorder_snapshots (id text primary key, state jsonb not null);';
    expect(findDestructivePatterns(sql)).toEqual([]);
  });
});

describe('stripSqlComments', () => {
  it('removes line comments and block comments', () => {
    const sql = '-- drop column x\nalter table t /* rename */ add column y int;\n/* drop constraint */';
    expect(stripSqlComments(sql)).toContain('alter table t');
    expect(stripSqlComments(sql)).not.toContain('drop column');
    expect(stripSqlComments(sql)).not.toContain('rename');
    expect(stripSqlComments(sql)).not.toContain('drop constraint');
  });
});

describe('jsonNotNullWithoutDefault', () => {
  it('matches only alter-table-add-column statements without a default', () => {
    expect(jsonNotNullWithoutDefault(['alter table t add column s jsonb not null'])).toBe(true);
    expect(jsonNotNullWithoutDefault(['alter table t add column s jsonb not null default \'{}\''])).toBe(false);
    expect(jsonNotNullWithoutDefault(['create table t (s jsonb not null)'])).toBe(false);
  });
});

describe('compatibilityAnnotation', () => {
  it('accepts a complete annotation', () => {
    const sql = `-- IOS-COMPATIBILITY:
-- Safe after App Store build 9999 is LIVE.
-- Gate minimum: 9999.
-- Old behavior preserved until then: no.
-- Rollback: restore the column and the old SELECT contract.
alter table teams drop column if exists scratch_col;`;
    const result = compatibilityAnnotation(sql);
    expect(result.present).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('rejects a missing annotation', () => {
    const result = compatibilityAnnotation('alter table teams drop column foo;');
    expect(result.present).toBe(false);
    expect(result.issues).toEqual(['missing -- IOS-COMPATIBILITY: annotation']);
  });

  it('flags each missing required field', () => {
    const sql = `-- IOS-COMPATIBILITY:
-- Gate minimum: 9999.
-- Old behavior preserved until then: yes.
alter table teams drop column foo;`;
    const result = compatibilityAnnotation(sql);
    expect(result.present).toBe(true);
    expect(result.issues.length).toBe(2);
    expect(result.issues.join(' ')).toContain('Safe after App Store build');
    expect(result.issues.join(' ')).toContain('Rollback');
  });

  it('does not treat a later comment block as part of the annotation', () => {
    const sql = `-- IOS-COMPATIBILITY:
-- Safe after App Store build 9999 is LIVE.
-- Gate minimum: 9999.
-- Old behavior preserved until then: yes.
-- Rollback: restore it.

-- A later, unrelated comment must not extend the annotation block.
alter table teams drop column foo;`;
    const result = compatibilityAnnotation(sql);
    expect(result.present).toBe(true);
    expect(result.issues).toEqual([]);
  });
});
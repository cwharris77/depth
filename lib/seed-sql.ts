// Shared SQL-string builders for committed seed scripts (supabase/seed*.sql). Every
// ingest source's own `<source>/seed-sql.ts` module (lib/espn/seed-sql.ts,
// lib/nflverse/seed-sql.ts) builds its rows, then calls insertStatement() here for the
// actual escaping/serialization -- one place owns "how does untrusted ingested text
// become a safe SQL literal", never duplicated per source.
export type Val = string | number | boolean | null | undefined;

// SQL literal for a single value. Strings are single-quote-escaped; null/undefined ->
// NULL. Untrusted ingested text (player names with apostrophes, etc.) must never break
// the script.
export function sqlValue(v: Val): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${v.replace(/'/g, "''")}'`;
}

// One multi-row INSERT for a table. By default ON CONFLICT DO NOTHING. Pass
// `updateColumns` when a bare identity row may already exist at the conflict target
// (e.g. teams, pre-seeded by 20260707190000_seed_teams.sql for FK purposes) so this
// seed's richer data overwrites the stub instead of silently no-oping. Empty rows -> ''.
export function insertStatement<T>(
  table: string,
  columns: (keyof T & string)[],
  rows: T[],
  conflict: string,
  updateColumns?: (keyof T & string)[]
): string {
  if (rows.length === 0) return '';
  const values = rows
    .map((r) => `  (${columns.map((c) => sqlValue(r[c] as unknown as Val)).join(', ')})`)
    .join(',\n');
  const action =
    updateColumns && updateColumns.length > 0
      ? `do update set ${updateColumns.map((c) => `${c} = excluded.${c}`).join(', ')}`
      : 'do nothing';
  return `insert into ${table} (${columns.join(', ')}) values\n${values}\non conflict (${conflict}) ${action};\n`;
}

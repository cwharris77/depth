// Shared SQL-string builders for committed seed scripts (supabase/seed*.sql). Every
// ingest source's own `<source>/seed-sql.ts` module (lib/espn/seed-sql.ts,
// lib/nflverse/seed-sql.ts) builds its rows, then calls insertStatement() here for the
// actual escaping/serialization -- one place owns "how does untrusted ingested text
// become a safe SQL literal", never duplicated per source.
export type Val = string | number | boolean | number[] | string[] | null | undefined;

function sqlTextArrayElement(value: string): string {
  return `E'${value.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

// SQL literal for a single value. Strings are single-quote-escaped; null/undefined ->
// NULL. number[] (Postgres int[]) preserves its existing '{1,2,3}' representation;
// string[] uses an ARRAY constructor so commas/braces never become array syntax, with
// quotes and backslashes escaped per element. Untrusted ingested text must never break
// the script.
export function sqlValue(v: Val): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) {
    if (v.length === 0) return "'{}'";
    if (typeof v[0] === 'string') {
      return `array[${(v as string[]).map(sqlTextArrayElement).join(', ')}]::text[]`;
    }
    return `'{${v.join(',')}}'`;
  }
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

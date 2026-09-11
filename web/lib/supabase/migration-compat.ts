// Pure scan logic for the iOS backend-compatibility guard
// (scripts/check-ios-compatibility.mts). Extracted from the script so the
// denylist — the load-bearing safety logic — is unit-tested against real and
// adversarial migration shapes (web/CLAUDE.md invariant 11: published data must stay
// decodable by every supported app build).
//
// The guard is deliberately a conservative denylist, not a SQL parser. An unusual
// but safe migration that trips it costs five minutes of annotation; a destructive
// pattern the denylist misses costs a broken release (the 2026-08-24 TestFlight
// failure was a dropped column an old binary still SELECTed). When it finds a
// destructive change it requires a `-- IOS-COMPATIBILITY:` annotation naming the
// App Store build the change is safe after, and the release manifest
// (ios-release-compatibility.md) must move with the change — see the script.

/** Strip line comments and block comments so a comment that merely *mentions* a
 *  destructive verb doesn't trip the guard (house style is comment-dense). */
export function stripSqlComments(sql: string): string {
  const noLine = sql.replace(/--.*$/gm, '');
  return noLine.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Split on statement-terminating semicolons so the JSON rule can reason about a
 * single ALTER TABLE ... ADD COLUMN statement instead of the whole file.
 */
export function sqlStatements(sql: string): string[] {
  return stripSqlComments(sql).split(';');
}

// A statement-based rule: adding a NOT NULL json/jsonb column on an EXISTING table
// without a default breaks every client that does an INSERT without supplying it.
export function jsonNotNullWithoutDefault(statements: string[]): boolean {
  return statements.some((stmt) => {
    const s = stmt.toLowerCase();
    return (
      s.includes('alter table') &&
      s.includes('add column') &&
      /\b(json|jsonb)\b/.test(stmt) &&
      /\bnot\s+null\b/.test(stmt) &&
      !/\bdefault\b/.test(stmt)
    );
  });
}

/** Names of the destructive-pattern families a migration matches, if any. */
export function findDestructivePatterns(content: string): string[] {
  const code = stripSqlComments(content);
  const matches: string[] = [];
  const patterns: { name: string; re: RegExp }[] = [
    { name: 'drop column', re: /\bdrop\s+column\b/i },
    { name: 'rename column/table', re: /\brename\s+(column|to|table)\b/i },
    { name: 'alter column type', re: /\balter\s+column\b[\s\S]*?\b(set\s+data\s+)?type\b/i },
    { name: 'drop constraint', re: /\bdrop\s+constraint\b/i },
    { name: 'drop table', re: /\bdrop\s+table\b/i },
    { name: 'drop type (enum)', re: /\bdrop\s+type\b/i },
    { name: 'enum value drop/rename', re: /\balter\s+type\b[\s\S]*?\b(drop|rename)\s+value\b/i },
  ];
  for (const { name, re } of patterns) {
    if (re.test(code)) matches.push(name);
  }
  if (jsonNotNullWithoutDefault(sqlStatements(content))) matches.push('json/jsonb NOT NULL without default (existing table)');
  return matches;
}

export interface CompatibilityAnnotation {
  present: boolean;
  issues: string[];
}

/**
 * Parses `git diff --name-status -M` output and returns the migration files whose
 * *content* changed, relative to `prefix` (e.g. `web/supabase/migrations/`).
 *
 * A pure rename (`R100`) is a move, not a schema change, so it is skipped: without
 * this, moving the migrations directory (the 2026-09 repo restructure) reported every
 * historical migration as changed and re-tripped the guard on destructive migrations
 * that shipped long before the annotation convention existed. A rename that also
 * edited the file (`R<100`) *is* a content change and is returned by its new path.
 * Adds, modifies, and type changes are returned by path; deletes by their old path,
 * so the caller still flags a deleted migration as a compatibility event.
 */
export function changedMigrationsFromNameStatus(nameStatus: string, prefix: string): string[] {
  const changed: string[] = [];
  for (const line of nameStatus.split('\n')) {
    const trimmed = line.replace(/\r$/, '');
    if (!trimmed) continue;
    const [status, first, second] = trimmed.split('\t');
    let path: string | undefined;
    if (status.startsWith('R') || status.startsWith('C')) {
      if (status.slice(1) === '100') continue; // move/copy with identical content
      path = second; // edited rename — scan the new path
    } else {
      path = first; // A/M/D/T
    }
    if (path && path.startsWith(prefix) && path.endsWith('.sql')) {
      changed.push(path.slice(prefix.length));
    }
  }
  return changed;
}

/** Parses and validates a `-- IOS-COMPATIBILITY:` header block. */
export function compatibilityAnnotation(content: string): CompatibilityAnnotation {
  // Annotation is a run of `-- ` comment lines immediately after the marker line.
  const lines = content.split('\n');
  const marker = lines.findIndex((l) => /^\s*--\s*IOS-COMPATIBILITY:/i.test(l));
  if (marker === -1) return { present: false, issues: ['missing -- IOS-COMPATIBILITY: annotation'] };

  const blockLines: string[] = [];
  for (let i = marker + 1; i < lines.length; i++) {
    const m = lines[i].match(/^\s*--\s?(.*)$/);
    if (!m) break;
    blockLines.push(m[1].trim());
  }
  const block = blockLines.join('\n');

  const issues: string[] = [];
  if (!/safe\s+after\s+app\s+store\s+build\s+\d+\s+is\s+live/i.test(block)) {
    issues.push('annotation must name the build: "Safe after App Store build <N> is LIVE."');
  }
  if (!/gate\s+minimum:\s*\d+/i.test(block)) {
    issues.push('annotation must state "Gate minimum: <N>."');
  }
  if (!/old\s+behavior\s+preserved\s+until\s+then:\s*(yes|no)/i.test(block)) {
    issues.push('annotation must state "Old behavior preserved until then: yes/no."');
  }
  if (!/rollback:/i.test(block)) {
    issues.push('annotation must include a "Rollback:" line');
  }
  return { present: true, issues };
}
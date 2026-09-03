// Formats and inserts uniform-unveiling notifications into the Obsidian vault's
// System/Inbox.md, for scripts/check-uniform-releases.mts. Replaces the GitHub-issue
// notification DEP-43 originally specified (reversed 2026-09-03 — see the vault's
// Projects/depth/Decisions.md).
//
// One inbox line per unveiling, not one per run: the vault's inbox-triage/capture-ticket
// flow turns each line into its own ticket, and every ticket from the same run-month
// carries the same suggested `theme:` epic name — so a month with six unveilings becomes
// six cards under one Epic swimlane, while a month with one becomes a lone ticket with no
// epic. The monitor never writes a ticket file itself: capture-ticket is the only
// sanctioned creator (its canonical path needs the Obsidian app running, which a headless
// cron job cannot assume).
//
// Insertion is pure and heading-anchored so it can be unit-tested without a vault, and so
// a missing/renamed heading degrades to "no write" rather than corrupting the note.

export type UnveilingNotice = {
  title: string;
  url: string;
};

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

// The epic a run's tickets get grouped under. Month-scoped because unveilings arrive in
// bursts (a league-wide Nike drop lands a half-dozen kits in one week) and an epic is
// meant to be one bounded effort, not a standing category.
export function epicNameForDate(date: Date): string {
  return `${date.getUTCFullYear()} Uniform Releases — ${MONTHS[date.getUTCMonth()]}`;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Mirrors the existing "- YYYY-MM-DD <project>: <what> → <where>" shape already used
// throughout System/Inbox.md, so a triage pass reads these the same as hand-captured items.
export function formatInboxLine(notice: UnveilingNotice, date: Date): string {
  const title = notice.title.replace(/\s+/g, ' ').trim();
  return `- ${isoDate(date)} depth: uniform unveiling — ${title} → ${notice.url} (epic: ${epicNameForDate(date)}, area: Uniform Archive)`;
}

const UNSORTED_HEADING = /^##[ \t]+Unsorted[ \t]*$/m;

// Returns the updated markdown, or null when the anchor heading is absent — the caller
// logs and skips the write rather than guessing where the lines belong.
export function insertUnsortedLines(markdown: string, lines: readonly string[]): string | null {
  if (lines.length === 0) return markdown;
  const match = typeof markdown === 'string' ? markdown.match(UNSORTED_HEADING) : null;
  if (!match || match.index === undefined) return null;

  const insertAt = match.index + match[0].length;
  return `${markdown.slice(0, insertAt)}\n\n${lines.join('\n')}${markdown.slice(insertAt)}`;
}

import type { TeamColors } from '../types';

// ESPN drift auto-promote — the DECISION half (pure, DB-free, fully unit-tested).
// The weekly ESPN ingest writes teams.colors; this decides whether a team's stored home
// row should change. ESPN is trusted, so a *stable* change is taken as truth automatically;
// the only human step is renaming the retired kit. The I/O half (reconcile-db.ts) applies
// the decision.
//
// Stability guard (why this isn't just "colors differ -> promote"):
//  - ESPN's transform falls back to #000000 when its feed omits a color, and feeds flap for
//    a week. So a change promotes ONLY when it (a) isn't a fallback sentinel, (b) has a
//    legible ui accent, and (c) is confirmed by TWO DISTINCT weekly pulls.
//  - "Distinct pull" is keyed on runId = season+ISO-week, NOT the script invocation — so a
//    retry or manual re-run in the same week can't count as the second confirmation.

export interface PendingHome {
  primary: string;
  secondary: string;
  // Identity of the pull that first staged this candidate (season+week). A later pull with
  // the same colors AND a different runId is the second confirmation.
  runId: string;
}

export interface ReconcileInput {
  // Freshly ingested current colors (teams.colors after this week's ESPN write).
  espn: TeamColors;
  // The team's current home row colors, or null if the team has no home row yet.
  home: TeamColors | null;
  // Staged candidate from a prior week, or null.
  pending: PendingHome | null;
  // Identity of THIS pull (season+ISO-week). Same across retries in one week.
  runId: string;
  // ESPN season year — used to date the retired snapshot, never the server calendar year.
  seasonYear: number;
  // contrastRatio(espn.uiAccent, DARK_BG) >= AA. Passed in so this stays free of the
  // colors dependency and trivially testable.
  isLegible: boolean;
}

export type ReconcileDecision =
  | { action: 'noop' }
  | { action: 'bootstrap' } // no home row exists -> create one from teams.colors
  | { action: 'stage'; pending: PendingHome } // first (or changed) sighting of a candidate
  | { action: 'clear-pending' } // candidate reverted / settled back to the current home
  | { action: 'hold'; reason: 'fallback' | 'contrast' } // change rejected; always clears pending
  | { action: 'promote'; retiredYear: number }; // confirmed twice -> pin new home, retire old

const FALLBACKS = new Set(['#000000', '#ffffff']);

function isFallback(c: TeamColors): boolean {
  return FALLBACKS.has(c.primary.toLowerCase()) || FALLBACKS.has(c.secondary.toLowerCase());
}

function sameColors(
  a: { primary: string; secondary: string },
  b: { primary: string; secondary: string }
): boolean {
  return (
    a.primary.toLowerCase() === b.primary.toLowerCase() &&
    a.secondary.toLowerCase() === b.secondary.toLowerCase()
  );
}

export function decideReconcile(input: ReconcileInput): ReconcileDecision {
  const { espn, home, pending, runId, seasonYear, isLegible } = input;

  // A team with no home row (added after the backfill migration) gets one, for free — this
  // restores the guarantee the old homeUniform() synthesis gave.
  if (!home) return { action: 'bootstrap' };

  const changed = !sameColors(espn, home);
  if (!changed) {
    // Settled or reverted back to the live home -> drop any half-confirmed candidate so a
    // later single sighting of it can't promote on one pull (the revert path).
    return pending ? { action: 'clear-pending' } : { action: 'noop' };
  }

  // Changed, but garbage: a fallback sentinel breaks the streak. Hold (clears pending).
  if (isFallback(espn)) return { action: 'hold', reason: 'fallback' };

  // Changed and real, but the derived accent wouldn't read on the dark UI. Never enshrine an
  // illegible home unattended — hold for a human.
  if (!isLegible) return { action: 'hold', reason: 'contrast' };

  // Valid change confirmed by a SECOND, DISTINCT pull -> promote.
  if (pending && sameColors(pending, espn) && pending.runId !== runId) {
    return { action: 'promote', retiredYear: seasonYear };
  }

  // First sighting, a different candidate than before, or a same-week retry (runId matches):
  // (re)stage and wait for confirmation. A same-runId re-stage is idempotent, never a promote.
  return {
    action: 'stage',
    pending: { primary: espn.primary, secondary: espn.secondary, runId },
  };
}

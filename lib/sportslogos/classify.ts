// Decides which SportsLogos.net News items are actual uniform unveilings, for
// scripts/check-uniform-releases.mts. The feed is a general NFL-news category, so the
// monitor's first run surfaced 30 items of which only ~7 were real reveals — the rest
// were listicles ("Ranking the NFL's uniforms"), Madden coverage, headwear drops, and
// pre-announcement leaks. Without this gate every run notifies on noise and the
// notification stops being read.
//
// Shape: a title has to clear a junk gate AND then carry both an unveiling verb and a
// uniform noun. The verb+noun requirement does most of the work (an opinion piece like
// "Jalen Hurts Pleads For..." has the noun but no verb); the junk gate exists for the
// cases that genuinely read like a reveal but aren't (a Madden "reveal", a New Era
// "launch", a "Sources:" leak that the real post will re-trigger days later).
//
// Untrusted input degrades, never throws (AGENTS.md invariant 6) — anything unparseable
// is simply rejected rather than crashing the check run.

export type RejectReason =
  | 'ranking-or-opinion'
  | 'video-game'
  | 'merchandise'
  | 'leak'
  | 'no-unveiling-verb'
  | 'no-uniform-noun';

export type UnveilingVerdict = { isUnveiling: true } | { isUnveiling: false; reason: RejectReason };

// Checked before the verb/noun test, because several of these read exactly like a
// reveal. Order matters only for which reason gets reported.
const JUNK_PATTERNS: ReadonlyArray<readonly [RegExp, RejectReason]> = [
  // A leading "Sources:" is the feed's unambiguous marker for a pre-announcement post.
  // Excluded by decision (2026-09-03): the official unveiling post always follows within
  // days and triggers on its own, so admitting these would notify twice per kit. Checked
  // first because such a post can also carry ranking/concept language.
  [/^\s*sources\s*:/i, 'leak'],
  // Madden / EA cover-athlete coverage. Uses "reveal" constantly and is never a real kit.
  [/\bmadden\b|\bea sports\b|\bcover athlete\b/i, 'video-game'],
  [/\bcollege football \d{2}\b/i, 'video-game'],
  // Headwear, sideline apparel, and sales figures — not a uniform the archive stores.
  [/\bnew era\b|\bsidelines? collection\b/i, 'merchandise'],
  [/\bjersey sales\b|\bapparel\b|\bmerchandise\b/i, 'merchandise'],
  // Listicles, power rankings, retrospectives, and wishlists. The single largest noise
  // category in the feed.
  [/\brank(?:ing|ed|s)?\b/i, 'ranking-or-opinion'],
  [/\bbest\b|\bworst\b|\bgreatest\b/i, 'ranking-or-opinion'],
  [/\bin need of a\b/i, 'ranking-or-opinion'],
  [/\bredesign\b|\bconcepts?\b/i, 'ranking-or-opinion'],
  // Unsourced leaks that don't use the "Sources:" prefix, checked last so a Madden cover
  // leak is reported as video-game noise rather than as a uniform leak.
  [/\bleaks?\b|\bleaked\b|\brumou?rs?\b/i, 'leak'],
];
const UNVEILING_VERB =
  /\b(?:unveil|reveal|launch|introduc|debut|announc|reviv|restor)(?:e|es|ed|ing|s)?\b|\b(?:to|will) wear\b/i;

const UNIFORM_NOUN =
  /\b(?:uniforms?|alternates?|throwbacks?|helmets?|jerseys?|kits?|uniform patch(?:es)?)\b/i;

export function classifyNewsItem(title: string): UnveilingVerdict {
  const text = typeof title === 'string' ? title : '';

  for (const [pattern, reason] of JUNK_PATTERNS) {
    if (pattern.test(text)) return { isUnveiling: false, reason };
  }
  if (!UNVEILING_VERB.test(text)) return { isUnveiling: false, reason: 'no-unveiling-verb' };
  if (!UNIFORM_NOUN.test(text)) return { isUnveiling: false, reason: 'no-uniform-noun' };

  return { isUnveiling: true };
}

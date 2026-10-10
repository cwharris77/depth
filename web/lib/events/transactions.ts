// ESPN's transactions feed -> trade events. Pure: no fetch, no DB.
//
// Each feed entry is one team's moves for one date as free text, several sentences long
// ("Traded CB Joey Porter Jr. to Dallas in exchange for ... . Signed DB ..."). Only
// sentences that open with "Traded" or "Acquired" are read.
//
// The feed does not reliably carry an entry for both clubs in a trade, so each trade
// sentence also yields the mirrored event for the other club when its name resolves to
// exactly one team. When both clubs do have an entry, the two descriptions of one move
// share a dedupe key and collapse into one event.
//
// The text is untrusted: anything that does not parse yields no event rather than a
// guess.

import { tradeCopy } from './copy';
import type { TeamEvent } from './types';

export interface EspnTransaction {
  date: string;
  description: string;
  team?: { id?: string };
}

export interface TradedPlayer {
  direction: 'in' | 'out';
  position: string;
  name: string;
}

// Verbs that open a sentence in the feed. Splitting only before one of these keeps a
// period inside a name ("A.J. Brown", "Porter Jr.") from ending a sentence.
const SENTENCE_VERBS = [
  'Traded',
  'Acquired',
  'Signed',
  'SIgned',
  'Re-signed',
  'Re-Signed',
  'Cut',
  'Placed',
  'Waived',
  'Released',
  'Elevated',
  'Designated',
  'Activated',
  'Claimed',
  'Promoted',
  'Reinstated',
  'Restored',
  'Suspended',
  'Terminated',
  'Announced',
];
// Splits on the whitespace after a period, keeping the period with its sentence. Two
// cases: before a known verb, and before any capitalized "-ed" word when the period ends a
// lowercase word. The second catches verbs missing from the list; requiring a lowercase
// letter before the period keeps initials ("D.J. Reed") from splitting a name.
const SENTENCE_BREAK = new RegExp(
  `(?<=\\.)\\s+(?=(?:${SENTENCE_VERBS.join('|')})\\b)|(?<=[a-z]\\.)\\s+(?=[A-Z][A-Za-z-]*ed\\s)`
);

const POSITIONS =
  'QB|RB|FB|WR|TE|OT|OL|OG|G|C|T|DE|DT|NT|DL|LB|OLB|ILB|MLB|CB|SS|FS|S|DB|PK|K|P|LS|EDGE';
const NAME_TOKEN = "[A-Z][A-Za-z.'\\-]*";
// A position code followed by a run of capitalized words. The run stops at the first
// lowercase word ("and", "to", "from", "for"), which is what separates a name from the
// rest of the sentence.
const MENTION = new RegExp(`\\b(${POSITIONS})\\s+(${NAME_TOKEN}(?:\\s+${NAME_TOKEN})*)`, 'g');
const FOR_CLAUSE = /\s(?:in exchange for|for)\s/;

export function splitSentences(description: string): string[] {
  return description
    .split(SENTENCE_BREAK)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
    .map((sentence) =>
      // Drop the closing period unless it belongs to a suffix, where it is part of the
      // name.
      /\b(?:Jr|Sr)\.$/.test(sentence) ? sentence : sentence.replace(/\.$/, '')
    );
}

function mentions(text: string, direction: 'in' | 'out'): TradedPlayer[] {
  return [...text.matchAll(MENTION)].map((match) => ({
    direction,
    position: match[1],
    name: match[2],
  }));
}

export interface TradeTeam {
  id: string;
  city: string;
  name: string;
}

interface ParsedTrade {
  players: TradedPlayer[];
  // The other club as written ("Dallas", "Philadelphia Eagles"), when the sentence names one.
  counterparty: string | null;
}

// The club named after "to" (a "Traded" sentence) or "from" (an "Acquired" one).
const COUNTERPARTY = /\s(?:to|from)\s+([A-Z0-9][A-Za-z0-9.' ]*?)(?=\s+(?:in exchange for|for)\s|$)/;

function parseTradeSentence(sentence: string): ParsedTrade | null {
  const outgoingFirst = sentence.startsWith('Traded ');
  if (!outgoingFirst && !sentence.startsWith('Acquired ')) return null;
  const split = sentence.search(FOR_CLAUSE);
  const head = split === -1 ? sentence : sentence.slice(0, split);
  const tail = split === -1 ? '' : sentence.slice(split);
  return {
    players: [
      ...mentions(head, outgoingFirst ? 'out' : 'in'),
      ...mentions(tail, outgoingFirst ? 'in' : 'out'),
    ],
    counterparty: COUNTERPARTY.exec(head)?.[1].trim() ?? null,
  };
}

function parseTrades(description: string): ParsedTrade[] {
  return splitSentences(description).flatMap((sentence) => parseTradeSentence(sentence) ?? []);
}

export function tradedPlayers(description: string): TradedPlayer[] {
  return parseTrades(description).flatMap((trade) => trade.players);
}

// A club as the feed writes it -> its team id. A nickname settles it on its own ("N.Y.
// Giants"); a bare city only when one team plays there. Anything else is unresolved.
export function resolveTradeTeam(text: string, teams: readonly TradeTeam[]): string | null {
  const wanted = text.trim().toLowerCase();
  if (!wanted) return null;
  const byName = teams.filter(
    (team) => wanted === team.name.toLowerCase() || wanted.endsWith(` ${team.name.toLowerCase()}`)
  );
  if (byName.length === 1) return byName[0].id;
  const byCity = teams.filter((team) => wanted === team.city.toLowerCase());
  return byCity.length === 1 ? byCity[0].id : null;
}

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

// A name held by two players resolves to null: an ambiguous match is not a match.
export function buildNameIndex(
  players: readonly { id: string; name: string }[]
): Map<string, string | null> {
  const index = new Map<string, string | null>();
  for (const player of players) {
    const key = normalizeName(player.name);
    const existing = index.get(key);
    if (existing === undefined) index.set(key, player.id);
    else if (existing !== player.id) index.set(key, null);
  }
  return index;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function tradeEvents(args: {
  transactions: readonly EspnTransaction[];
  teamIdByEspnId: ReadonlyMap<string, string>;
  teams: readonly TradeTeam[];
  playerIdByName: ReadonlyMap<string, string | null>;
  now: string;
  // The feed lists the whole season; only recent entries are news.
  windowDays?: number;
}): TeamEvent[] {
  const nowMs = Date.parse(args.now);
  const windowMs = (args.windowDays ?? 7) * DAY_MS;
  const teamById = new Map(args.teams.map((team) => [team.id, team]));
  // Keyed by dedupe key, so one move described by both clubs is kept once.
  const events = new Map<string, TeamEvent>();

  const add = (team: TradeTeam, player: TradedPlayer, occurredAt: string): void => {
    const nameKey = normalizeName(player.name);
    const dedupeKey = `trade:${team.id}:${occurredAt.slice(0, 10)}:${player.direction}:${nameKey}`;
    if (events.has(dedupeKey)) return;
    const copy = tradeCopy({
      teamName: team.name,
      direction: player.direction,
      position: player.position,
      playerName: player.name,
    });
    events.set(dedupeKey, {
      dedupeKey,
      type: 'trade',
      tier: 'big_moments',
      teamId: team.id,
      playerId: args.playerIdByName.get(nameKey) ?? null,
      headline: copy.headline,
      detail: copy.detail,
      payload: {
        direction: player.direction,
        position: player.position,
        player_name: player.name,
      },
      source: 'espn_transactions',
      occurredAt,
    });
  };

  for (const transaction of args.transactions) {
    const team = teamById.get(args.teamIdByEspnId.get(transaction.team?.id ?? '') ?? '');
    const occurredMs = Date.parse(transaction.date);
    if (!team || Number.isNaN(occurredMs)) continue;
    if (nowMs - occurredMs > windowMs) continue;
    const occurredAt = new Date(occurredMs).toISOString();

    for (const trade of parseTrades(transaction.description ?? '')) {
      const otherId = trade.counterparty ? resolveTradeTeam(trade.counterparty, args.teams) : null;
      const other = otherId && otherId !== team.id ? teamById.get(otherId) : undefined;
      for (const player of trade.players) {
        add(team, player, occurredAt);
        if (other) {
          add(
            other,
            { ...player, direction: player.direction === 'out' ? 'in' : 'out' },
            occurredAt
          );
        }
      }
    }
  }
  return [...events.values()];
}

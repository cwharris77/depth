import { INJURIES } from './injuries';
import { mapDepthchartPosition, mapSpecialPosition } from './positions';
import { parseAthleteId } from './transform';
import type { EspnRoster, EspnDepthcharts, EspnAthlete } from './types';
import type { TeamObservation, ObservedDepthSlot } from '@/lib/events/types';

export function observeTeamEvents(args: {
  teamId: string;
  teamName: string;
  observedAt: string;
  roster: EspnRoster;
  depthcharts: EspnDepthcharts;
}): { observation: TeamObservation; errors: string[]; diagnostics: string[] } {
  const errors: string[] = [];
  const diagnostics: string[] = [];
  const bios = new Map<string, EspnAthlete>();
  for (const group of Array.isArray(args.roster?.athletes) ? args.roster.athletes : []) {
    if (!Array.isArray(group?.items)) {
      errors.push('missing roster group items');
      continue;
    }
    for (const bio of group.items) {
      if (typeof bio?.id !== 'string' || typeof bio.fullName !== 'string' || !bio.fullName.trim()) {
        errors.push('invalid athlete identity');
        continue;
      }
      bios.set(bio.id, bio);
    }
  }
  if (!Array.isArray(args.roster.athletes) || bios.size === 0)
    errors.push('missing roster athletes');
  if (!Array.isArray(args.depthcharts.items) || args.depthcharts.items.length === 0)
    errors.push('missing depth chart items');
  const slots = new Map<string, ObservedDepthSlot>();
  const covered = new Set<string>();
  const uncertain = new Set<string>();
  for (const item of Array.isArray(args.depthcharts?.items) ? args.depthcharts.items : []) {
    if (!item?.positions || typeof item.positions !== 'object' || Array.isArray(item.positions)) {
      errors.push('missing chart positions');
      continue;
    }
    for (const [key, data] of Object.entries(item.positions)) {
      if (key.toLowerCase() === 'h') continue;
      const special = mapSpecialPosition(key);
      const position =
        mapDepthchartPosition(key) ??
        (['ldt', 'rdt'].includes(key.toLowerCase()) ? key.toUpperCase() : null) ??
        (special === 'kr' || special === 'pr' ? special.toUpperCase() : null);
      if (!position) {
        diagnostics.push(`unmapped position: ${key}`);
        continue;
      }
      if (!Array.isArray(data?.athletes)) {
        diagnostics.push(`missing athletes at ${key}`);
        uncertain.add(position);
        continue;
      }
      covered.add(position);
      for (const entry of data.athletes) {
        const rank = entry?.rank ?? entry?.slot ?? 1;
        const id =
          typeof entry?.athlete?.$ref === 'string' ? parseAthleteId(entry.athlete.$ref) : null;
        const bio = id ? bios.get(id) : undefined;
        if (!Number.isSafeInteger(rank) || rank < 1 || !id || !bio?.fullName?.trim()) {
          diagnostics.push(`invalid or unresolved slot: ${key}/${rank}/${id ?? '?'}`);
          uncertain.add(position);
          continue;
        }
        const slotKey = `${position}:${rank}`;
        if (
          [...slots.values()].some(
            (slot) => slot.position === position && slot.playerId === id && slot.depthRank !== rank
          )
        ) {
          diagnostics.push(`conflicting athlete ranks: ${position}/${id}`);
          uncertain.add(position);
          continue;
        }
        const prior = slots.get(slotKey);
        if (prior && prior.playerId !== id) {
          diagnostics.push(`conflicting slot: ${slotKey}`);
          uncertain.add(position);
          continue;
        }
        slots.set(slotKey, { position, depthRank: rank, playerId: id, playerName: bio.fullName });
      }
    }
  }
  const injuries = [...bios.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((bio) => {
      if (!bio.id || !bio.fullName?.trim()) errors.push('invalid athlete identity');
      let designations: string[] | null = null;
      if (Array.isArray(bio.injuries)) {
        const labels = bio.injuries.map((injury) =>
          typeof injury?.status === 'string'
            ? INJURIES.get(injury.status.trim().toLowerCase())
            : undefined
        );
        if (labels.every((label): label is string => label !== undefined))
          designations = [...new Set(labels)].sort();
        else diagnostics.push(`unknown injury designation: ${bio.id}`);
      } else diagnostics.push(`injury report unavailable: ${bio.id}`);
      return { playerId: bio.id, playerName: bio.fullName, designations };
    });
  return {
    observation: {
      teamId: args.teamId,
      teamName: args.teamName,
      observedAt: args.observedAt,
      slots: [...slots.values()]
        .filter((slot) => !uncertain.has(slot.position))
        .sort((a, b) => a.position.localeCompare(b.position) || a.depthRank - b.depthRank),
      coveredPositions: [...covered].filter((position) => !uncertain.has(position)).sort(),
      injuries,
    },
    errors,
    diagnostics,
  };
}

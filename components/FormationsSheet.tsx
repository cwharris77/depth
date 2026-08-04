'use client';

import { Check, X } from 'lucide-react';
import IconButton from './ui/IconButton';
import { colors as uiTokens } from '@/components/ui/tokens';
import { alignmentLabel } from '@/lib/formations';
import type { TeamFormation, Unit } from '@/lib/types';

// One row per real formation title -- offense reads as "Shotgun 11", defense as
// "Nickel (4-2-5)" (front label + the raw DL-LB-DB shorthand, since unlike offense's
// {RB}{TE} code the same front name can cover more than one DL/LB split).
function rowTitle(unit: Unit, f: TeamFormation): string {
  if (unit === 'offense') return `${alignmentLabel(f.alignment)} ${f.personnel}`;
  return `${f.alignment} (${f.personnel})`;
}

// Groups offense rows by RB/TE code (e.g. "11 personnel") and defense rows by front
// name (e.g. "Nickel") -- the dimension each unit's alignment label doesn't already
// carry on its own.
function groupKey(unit: Unit, f: TeamFormation): string {
  return unit === 'offense' ? `${f.personnel} personnel` : f.alignment;
}

type Row = { kind: 'header'; label: string } | { kind: 'formation'; formation: TeamFormation };

// Always grouped by personnel/front, groups ordered by their top formation's share,
// rows within a group ordered by share -- most teams have too few real formations for
// a separate "by share" view to earn its own tab (see the now-removed sort toggle).
function groupedRows(unit: Unit, formations: TeamFormation[]): Row[] {
  const byShare = formations.slice().sort((a, b) => b.pct - a.pct);
  const byCat = new Map<string, TeamFormation[]>();
  for (const f of byShare) {
    const key = groupKey(unit, f);
    byCat.set(key, [...(byCat.get(key) ?? []), f]);
  }
  const cats = [...byCat.keys()].sort(
    (a, b) =>
      Math.max(...byCat.get(b)!.map((f) => f.pct)) - Math.max(...byCat.get(a)!.map((f) => f.pct))
  );
  return cats.flatMap((cat): Row[] => [
    { kind: 'header', label: cat },
    ...byCat.get(cat)!.map((formation): Row => ({ kind: 'formation', formation })),
  ]);
}

// The Formations sheet (single-select list, opened from the ••• menu). Every real
// formation the team ran that season for whichever unit is currently active on the field
// (offense/defense tabs share this same component; special teams has no real data, see
// DEP-141, so it shows an explanatory empty state instead of an empty list). The generic
// "Base" fallback (lib/formations.ts) is used when a unit has no real-formation rows, but
// it's never listed here as something to pick -- selection always defaults to the team's
// top formation instead (see DepthChartField's topFormationFor).
export default function FormationsSheet({
  unit,
  formations,
  activeFormation,
  onSelect,
  onClose,
  accent,
}: {
  unit: Unit;
  formations: TeamFormation[];
  activeFormation: TeamFormation | null;
  onSelect: (formation: TeamFormation | null) => void;
  onClose: () => void;
  accent: string;
}) {
  return (
    // height: 100% fills whatever BottomSheet's own maxHeight cap allows -- a fixed vh
    // value here previously exceeded that cap and got clipped by BottomSheet's
    // overflow: hidden, cutting off the bottom of the list (see SeasonSheet for the
    // same pattern).
    <div className="flex flex-col" style={{ height: '100%', minHeight: 0 }}>
      <div className="flex items-center justify-center pt-2.5 pb-0.5" style={{ flex: '0 0 auto' }}>
        <div className="h-1 w-9 rounded-full" style={{ background: uiTokens.borderInput }} />
      </div>
      <div className="flex items-center justify-end px-5 pt-1 pb-1" style={{ flex: '0 0 auto' }}>
        <IconButton
          icon={<X size={16} color={uiTokens.textMuted} />}
          variant="plain"
          size="sm"
          onClick={onClose}
          ariaLabel="Close"
        />
      </div>

      {unit === 'special' ? (
        <div className="px-5 pb-6 text-sm" style={{ color: uiTokens.textFaint, flex: '0 0 auto' }}>
          No formations available for special teams.
        </div>
      ) : (
        <>
          <div
            className="overflow-y-auto px-4 pt-1 pb-2 flex flex-col gap-1.5"
            style={{ WebkitOverflowScrolling: 'touch', flex: '1 1 auto', minHeight: 0 }}>
            {groupedRows(unit, formations).map((row, i) =>
              row.kind === 'header' ? (
                <div
                  key={`h-${row.label}-${i}`}
                  className="px-1 pt-2 pb-0.5 text-[10px] font-extrabold uppercase tracking-wide"
                  style={{ color: uiTokens.textFaintest }}>
                  {row.label}
                </div>
              ) : (
                <FormationRow
                  key={`${row.formation.unit}-${row.formation.alignment}-${row.formation.personnel}`}
                  title={rowTitle(unit, row.formation)}
                  pct={row.formation.pct}
                  active={activeFormation === row.formation}
                  accent={accent}
                  onClick={() => onSelect(row.formation)}
                />
              )
            )}
          </div>
          <div
            className="text-center text-[10px] pb-4 pt-1"
            style={{ color: uiTokens.textFaint, flex: '0 0 auto' }}>
            Formation data © FTN Data (CC-BY-SA 4.0)
          </div>
        </>
      )}
    </div>
  );
}

// pct is stored as a rounded integer (lib/types.ts) -- a formation run on well under 1%
// of plays rounds to 0, which reads as "never happened" rather than "rare." Floor it at
// a "<1%" label instead of a bare "0%".
function pctLabel(pct: number): string {
  return pct === 0 ? '<1%' : `${pct}%`;
}

function FormationRow({
  title,
  pct,
  active,
  accent,
  onClick,
}: {
  title: string;
  pct?: number;
  active: boolean;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left"
      style={{
        touchAction: 'manipulation',
        background: active ? `${accent}24` : 'transparent',
        border: `1px solid ${active ? accent : uiTokens.borderDefault}`,
      }}>
      <div className="min-w-0 flex-1">
        <div
          className="truncate text-sm font-extrabold"
          style={{ color: active ? accent : uiTokens.textSecondary }}>
          {title}
        </div>
      </div>
      {pct !== undefined && (
        // Two lines, not a bare "22%" -- without a separate personnel/utilization
        // breakdown the number alone doesn't say what it's a share OF.
        <div className="shrink-0 text-right">
          <div className="text-sm font-black" style={{ color: uiTokens.textPrimary }}>
            {pctLabel(pct)}
          </div>
          <div className="text-[9px] font-semibold" style={{ color: uiTokens.textFaint }}>
            of plays
          </div>
        </div>
      )}
      {active && <Check size={16} color={accent} strokeWidth={3} className="shrink-0" />}
    </button>
  );
}

'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import IconButton from './ui/IconButton';
import { colors as uiTokens } from '@/components/ui/tokens';
import { alignmentLabel } from '@/lib/formations';
import type { TeamFormation, Unit } from '@/lib/types';

type Sort = 'flat' | 'grouped';

const UNIT_TITLES: Record<Unit, string> = {
  offense: 'Offense formations',
  defense: 'Defense formations',
  special: 'Special teams',
};

// One row per real formation title -- offense reads as "Shotgun 11", defense as
// "Nickel (4-2-5)" (front label + the raw DL-LB-DB shorthand, since unlike offense's
// {RB}{TE} code the same front name can cover more than one DL/LB split).
function rowTitle(unit: Unit, f: TeamFormation): string {
  if (unit === 'offense') return `${alignmentLabel(f.alignment)} ${f.personnel}`;
  return `${f.alignment} (${f.personnel})`;
}

// "By personnel" groups offense rows by RB/TE code (e.g. "11 personnel") and defense
// rows by front name (e.g. "Nickel") -- the dimension each unit's alignment label
// doesn't already carry on its own in "by share" order.
function groupKey(unit: Unit, f: TeamFormation): string {
  return unit === 'offense' ? `${f.personnel} personnel` : f.alignment;
}

type Row = { kind: 'header'; label: string } | { kind: 'formation'; formation: TeamFormation };

function sortedRows(unit: Unit, formations: TeamFormation[], sort: Sort): Row[] {
  const byShare = formations.slice().sort((a, b) => b.pct - a.pct);
  if (sort === 'flat') return byShare.map((formation) => ({ kind: 'formation', formation }));

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

// The Formations sheet (single-select list, opened from the ••• menu). Base + top-3
// real formations for whichever unit is currently active on the field (offense/defense
// tabs share this same component; special teams has no real data, see DEP-141, so it
// shows an explanatory empty state instead of an empty list).
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
  const [sort, setSort] = useState<Sort>('flat');

  return (
    <div className="flex flex-col" style={{ maxHeight: '74vh', minHeight: 0 }}>
      <div className="flex items-center justify-center pt-2.5 pb-0.5" style={{ flex: '0 0 auto' }}>
        <div className="h-1 w-9 rounded-full" style={{ background: uiTokens.borderInput }} />
      </div>
      <div
        className="flex items-center justify-between px-5 pt-2 pb-2"
        style={{ flex: '0 0 auto' }}>
        <h2 className="text-base font-black" style={{ color: uiTokens.textPrimary }}>
          {UNIT_TITLES[unit]}
        </h2>
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
            className="px-5 pb-2 text-xs"
            style={{ color: uiTokens.textFaint, flex: '0 0 auto' }}>
            Tap a formation — the field rearranges into it live
          </div>
          <div className="flex gap-1.5 px-5 pb-3" style={{ flex: '0 0 auto' }}>
            <SortButton label="By share" active={sort === 'flat'} onClick={() => setSort('flat')} />
            <SortButton
              label="By personnel"
              active={sort === 'grouped'}
              onClick={() => setSort('grouped')}
            />
          </div>
          <div
            className="overflow-y-auto px-4 pb-2 flex flex-col gap-1.5"
            style={{ WebkitOverflowScrolling: 'touch', flex: '1 1 auto', minHeight: 0 }}>
            <FormationRow
              title="Base formation"
              subtitle="Generic starter look"
              active={activeFormation === null}
              accent={accent}
              onClick={() => onSelect(null)}
            />
            {sortedRows(unit, formations, sort).map((row, i) =>
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

function SortButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full px-3 py-1.5 text-[10px] font-bold"
      style={{
        touchAction: 'manipulation',
        background: active ? uiTokens.surfaceChipHover : uiTokens.surfaceChip,
        color: active ? uiTokens.textPrimary : uiTokens.textSecondary,
      }}>
      {label}
    </button>
  );
}

function FormationRow({
  title,
  subtitle,
  pct,
  active,
  accent,
  onClick,
}: {
  title: string;
  subtitle?: string;
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
        {subtitle && (
          <div className="mt-0.5 text-xs" style={{ color: uiTokens.textFaint }}>
            {subtitle}
          </div>
        )}
      </div>
      {pct !== undefined && (
        <div className="shrink-0 text-sm font-black" style={{ color: uiTokens.textPrimary }}>
          {pct}%
        </div>
      )}
      {active && <Check size={16} color={accent} strokeWidth={3} className="shrink-0" />}
    </button>
  );
}

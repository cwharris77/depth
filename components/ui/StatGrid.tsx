import { colors } from './tokens';

type Stat = { label: string; value: string | number };

type StatGridProps = {
  stats: Stat[];
};

// 4-column stat readout (player card: AGE / EXP / HT / WT). Equal columns, thin
// dividers, label above value.
export default function StatGrid({ stats }: StatGridProps) {
  return (
    <div
      className="grid rounded-3xl"
      style={{
        gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
        background: colors.surfaceCard2,
        border: `1px solid ${colors.borderDefault}`,
      }}>
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="flex flex-col items-center py-3"
          style={{ borderLeft: i === 0 ? 'none' : `1px solid ${colors.borderDefault}` }}>
          <div
            className="text-[10px] font-semibold tracking-wide"
            style={{ color: colors.textMuted }}>
            {s.label}
          </div>
          <div className="mt-0.5 text-base font-black" style={{ color: colors.textPrimary }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

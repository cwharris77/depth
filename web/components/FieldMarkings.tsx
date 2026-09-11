import { colors as uiTokens } from '@/components/ui/tokens';

// Ten-yard increments painted the way real fields paint them: two-digit numbers
// 10-20-30-40-50 counting up from each goal line, with the 50 at midfield, each
// carrying a small directional arrow toward its nearer goal line (real fields paint
// the same arrow so a number reads unambiguously without checking which yard line
// it sits on -- see the reference photo this replaces the digit-split gap hack with).
// y values are percentages of the 100-unit viewBox, matching the yard lines every 10%.
const YARD_NUMBERS = [10, 20, 30, 40, 50, 60, 70, 80, 90];

// Solid filled triangle, tip pointing toward the near goal line (`dir`), planted just
// past the number on that side. x/y are viewBox units; the arrow is drawn in the
// field's actual (unrotated) up/down axis, which is also the reading direction of the
// rotated yard numbers next to it, so it lines up with the number regardless of which
// sideline column it's attached to.
function GoalArrow({ x, y, dir }: { x: number; y: number; dir: 'up' | 'down' }) {
  const tipY = dir === 'up' ? y - 1.8 : y + 1.8;
  const baseY = dir === 'up' ? y - 0.3 : y + 0.3;
  return <polygon points={`${x - 1.1},${baseY} ${x + 1.1},${baseY} ${x},${tipY}`} fill="#fff" />;
}

export default function FieldMarkings() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg">
      {/* yard lines spaced every 10% */}
      {[10, 20, 30, 40, 60, 70, 80, 90].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="100"
          y2={y}
          stroke={uiTokens.borderStrong}
          strokeWidth="0.4"
        />
      ))}
      {/* Yard numbers on both sidelines, hidden below lg like the dot labels so the
          mobile field stays dot-only. Each column rotates 180° from the other so the
          two rows mirror each other, each reading from its own sideline the way real
          fields paint them. White like real field paint, solid (no artificial digit
          gap) with a small arrow beside each number pointing toward its nearer goal
          line -- 50 gets no arrow, matching the reference photo. Sized down from
          real-field proportions so the digits never reach the dot labels inboard. */}
      {YARD_NUMBERS.map((y) => {
        const n = y <= 50 ? y : 100 - y;
        const dir: 'up' | 'down' | null = y < 50 ? 'up' : y > 50 ? 'down' : null;
        const arrowY = dir === 'up' ? y - 2.8 : y + 2.8;
        return (
          <g key={y} className="hidden lg:block">
            <text
              x="5"
              y={y}
              dominantBaseline="central"
              textAnchor="middle"
              fill="#fff"
              fontSize="4"
              fontWeight="bold"
              transform={`rotate(90 5 ${y})`}>
              {n}
            </text>
            {dir && <GoalArrow x={5} y={arrowY} dir={dir} />}
            <text
              x="95"
              y={y}
              dominantBaseline="central"
              textAnchor="middle"
              fill="#fff"
              fontSize="4"
              fontWeight="bold"
              transform={`rotate(-90 95 ${y})`}>
              {n}
            </text>
            {dir && <GoalArrow x={95} y={arrowY} dir={dir} />}
          </g>
        );
      })}
      {/* end zones */}
      <rect x="0" y="0" width="100" height="6" fill="rgba(30,32,38,0.3)" />
      <rect x="0" y="94" width="100" height="6" fill="rgba(30,32,38,0.3)" />
      {/* line of scrimmage — solid blue, matching TV broadcast overlays */}
      <line x1="0" y1="50" x2="100" y2="50" stroke="#2d6fe0" strokeWidth="0.6" />
      {/* hash marks */}
      {[15, 25, 35, 45, 55, 65, 75, 85].map((y) => (
        <g key={`hash-${y}`}>
          <line
            x1="32"
            y1={y}
            x2="35"
            y2={y}
            stroke={uiTokens.surfaceChipHover}
            strokeWidth="0.4"
          />
          <line
            x1="65"
            y1={y}
            x2="68"
            y2={y}
            stroke={uiTokens.surfaceChipHover}
            strokeWidth="0.4"
          />
        </g>
      ))}
    </svg>
  );
}

import { colors as uiTokens } from '@/components/ui/tokens';

// Ten-yard increments, mirrored the way real fields paint them: count up from each
// goal line (10…40), with midfield left to the blue line-of-scrimmage line. Values
// are percentages of the 100-unit viewBox, matching the yard lines every 10%.
const YARD_NUMBERS = [10, 20, 30, 40, 60, 70, 80, 90];

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
          mobile field stays dot-only. textFaint at 50% keeps them legible at this
          size while staying quieter than any chrome text; rotated to read from the
          near sideline like painted numbers. */}
      {YARD_NUMBERS.map((y) => {
        const n = y < 50 ? y / 10 : (100 - y) / 10;
        return (
          <g key={y} className="hidden lg:block">
            <text
              x="5"
              y={y}
              dominantBaseline="central"
              textAnchor="middle"
              fill={uiTokens.textFaint}
              fontSize="4"
              fontWeight="bold"
              opacity="0.5"
              transform={`rotate(-90 5 ${y})`}>
              {n}
            </text>
            <text
              x="95"
              y={y}
              dominantBaseline="central"
              textAnchor="middle"
              fill={uiTokens.textFaint}
              fontSize="4"
              fontWeight="bold"
              opacity="0.5"
              transform={`rotate(-90 95 ${y})`}>
              {n}
            </text>
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

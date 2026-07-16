import Logo from './Logo';

// The depth logo + "depth" wordmark. Doubles as the nav-drawer trigger in the team header
// (DepthChartField) and the uniform archive header (UniformArchive) — centralized here so a
// size bump lands once instead of drifting per call site (ticket: bigger menu button and
// wordmark). Also rendered non-interactively in app/team/[id]/loading.tsx's skeleton so the
// real header doesn't jump in at a different size once data loads.
//
// Sizing: the wordmark span's color is always the fixed `#A5ACAF` used everywhere it's
// rendered; only the logo mark's color varies (team/brand accent), so it's the one prop here.
export default function DepthMark({ color, onClick }: { color: string; onClick?: () => void }) {
  const content = (
    <>
      <Logo size={26} color={color} />
      <span className="text-base font-bold tracking-widest" style={{ color: '#A5ACAF' }}>
        depth
      </span>
    </>
  );

  if (!onClick) {
    return <div className="flex items-center gap-1 shrink-0">{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open navigation"
      className="flex items-center gap-1 shrink-0"
      style={{ touchAction: 'manipulation' }}>
      {content}
    </button>
  );
}

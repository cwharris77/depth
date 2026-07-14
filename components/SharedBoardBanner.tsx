'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { TeamDepthOverride } from '@/lib/depth-overrides';
import type { TeamMeta } from '@/lib/roster-source';
import { resolveBoard, type BoardResolution, type SharedBoard } from '@/lib/shared-board';

// The shared-board preview banner (Phase C, share pass). Reads /team/[id]?board=<slug>,
// resolves it via /api/shares/[slug], and — unlike the old ?order= links, which silently
// overwrote the visitor's own saved order — shows the owner's order as a *preview* the visitor
// explicitly Applies or Dismisses. Preview is lifted to DepthChartField (onPreview) so the
// field renders the shared order without persisting; Apply commits it, Dismiss drops it.
// Isolated in a Suspense boundary because useSearchParams needs one during static generation.
type Props = {
  currentTeam: Pick<TeamMeta, 'id' | 'city' | 'name'>;
  teams: TeamMeta[];
  accent: string;
  onPreview: (override: TeamDepthOverride | null) => void;
  onApply: (override: TeamDepthOverride) => void;
};

function Inner({ currentTeam, teams, accent, onPreview, onApply }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const slug = searchParams.get('board');

  const [board, setBoard] = useState<SharedBoard | null>(null);
  const [resolution, setResolution] = useState<BoardResolution>('none');

  // Drop the ?board param — on apply, dismiss, or an unresolved slug — keeping the rest of
  // the URL. The link itself stays shareable; only this viewer's local URL is cleaned.
  const strip = () => router.replace(pathname, { scroll: false });

  useEffect(() => {
    if (!slug) {
      setResolution('none');
      setBoard(null);
      onPreview(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/shares/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? (r.json() as Promise<SharedBoard>) : null))
      .then((data) => {
        if (cancelled) return;
        const res = resolveBoard(slug, data, currentTeam.id);
        setBoard(data);
        setResolution(res);
        if (res === 'preview' && data) onPreview(data.override);
        if (res === 'strip') strip();
      })
      .catch(() => {
        if (cancelled) return;
        setResolution('strip');
        strip();
      });
    return () => {
      cancelled = true;
    };
    // onPreview/onApply/strip are stable enough; re-run only when the slug or team changes.
  }, [slug, currentTeam.id]);

  if (resolution === 'preview' && board) {
    return (
      <Banner accent={accent}>
        <span className="min-w-0 truncate">
          Viewing <strong>{board.ownerName}</strong>&apos;s custom {currentTeam.city}{' '}
          {currentTeam.name} depth chart
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onApply(board.override);
              onPreview(null);
              strip();
            }}
            className="rounded-full px-3 py-1 text-[11px] font-bold"
            style={{ background: accent, color: '#0a0e1a' }}>
            Apply to my chart
          </button>
          <button
            type="button"
            onClick={() => {
              onPreview(null);
              strip();
            }}
            className="rounded-full px-3 py-1 text-[11px] font-bold"
            style={{ background: 'rgba(255,255,255,0.1)', color: '#dfe5f0' }}>
            Dismiss
          </button>
        </div>
      </Banner>
    );
  }

  if (resolution === 'redirect' && board) {
    const target = teams.find((t) => t.id === board.teamId);
    const label = target ? `${target.city} ${target.name}` : 'another team';
    return (
      <Banner accent={accent}>
        <span className="min-w-0 truncate">
          <strong>{board.ownerName}</strong>&apos;s shared board is for {label}
        </span>
        <Link
          href={`/team/${encodeURIComponent(board.teamId)}?board=${encodeURIComponent(slug ?? '')}`}
          className="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold"
          style={{ background: accent, color: '#0a0e1a' }}>
          View it
        </Link>
      </Banner>
    );
  }

  return null;
}

function Banner({ accent, children }: { accent: string; children: ReactNode }) {
  return (
    <div
      className="mt-3 flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[12px]"
      style={{
        color: '#dfe5f0',
        background: `${accent}1a`,
        border: `1px solid ${accent}55`,
      }}>
      {children}
    </div>
  );
}

export default function SharedBoardBanner(props: Props) {
  return (
    <Suspense fallback={null}>
      <Inner {...props} />
    </Suspense>
  );
}

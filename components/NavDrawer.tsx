'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, ClipboardList, Grid, User } from 'lucide-react';
import { useUser } from '@/lib/use-user';

// Left navigation drawer (nav IA — 2026-07-08-nav-drawer-design.md). Global, growing
// navigation lives here, opened from the header logo, so the team header isn't crowded and new
// views (Phase E) have a home. The primary interaction (team switcher) stays in the header —
// hidden nav is for secondary/global items only (NN/G research). Scrim tap + Esc + close button
// dismiss; focus is trapped while open and restored to the trigger on close; body scroll locks.

function NavItem({
  href,
  icon,
  label,
  onNavigate,
  accent,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onNavigate: () => void;
  accent: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className="flex items-center gap-3 px-4 py-3"
      style={
        active
          ? { background: `${accent}1F`, borderLeft: `3px solid ${accent}`, color: '#f0f4ff' }
          : { color: '#dfe5f0', borderLeft: '3px solid transparent' }
      }>
      <span style={{ color: active ? accent : '#A5ACAF', display: 'inline-flex' }}>{icon}</span>
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}

export default function NavDrawer({
  open,
  onClose,
  accent,
}: {
  open: boolean;
  onClose: () => void;
  accent: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  // Which destination is current: the archive when on /uniforms, otherwise the depth charts
  // (home + team pages). Drives the active highlight consistently across routes.
  const pathname = usePathname();
  const { user } = useUser();
  const activeHref = pathname?.startsWith('/uniforms')
    ? '/uniforms'
    : pathname?.startsWith('/signin')
      ? '/signin'
      : '/';

  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = panel
      ? Array.from(
          panel.querySelectorAll<HTMLElement>('a[href], button, [tabindex]:not([tabindex="-1"])')
        )
      : [];
    focusables[0]?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      panel?.animate([{ transform: 'translateX(-100%)' }, { transform: 'translateX(0)' }], {
        duration: 200,
        easing: 'ease-out',
      });
      scrimRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      restoreFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
      style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      <div
        ref={scrimRef}
        onClick={onClose}
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }}
      />
      <div
        ref={panelRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: 'min(82vw, 320px)',
          background: '#0d1320',
          borderRight: '1px solid #222b3d',
          paddingTop: 'max(env(safe-area-inset-top), 16px)',
          display: 'flex',
          flexDirection: 'column',
        }}>
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-base font-bold tracking-widest" style={{ color: '#f0f4ff' }}>
            depth
          </span>
          <button type="button" onClick={onClose} aria-label="Close navigation" className="p-1">
            <X size={18} color="#A5ACAF" />
          </button>
        </div>
        <nav className="flex flex-col flex-1">
          <NavItem
            href="/"
            icon={<ClipboardList size={19} />}
            label="Depth charts"
            onNavigate={onClose}
            accent={accent}
            active={activeHref === '/'}
          />
          <NavItem
            href="/uniforms"
            icon={<Grid size={19} />}
            label="Uniform archive"
            onNavigate={onClose}
            accent={accent}
            active={activeHref === '/uniforms'}
          />
        </nav>
        {/* Account lives at the bottom — a link to the sign-in / settings page, not an
            inline form. Signing in is opt-in (Phase C, auth pass 1). */}
        <div style={{ borderTop: '1px solid #222b3d' }}>
          <NavItem
            href="/signin"
            icon={<User size={19} />}
            label={user ? 'Account' : 'Sign in'}
            onNavigate={onClose}
            accent={accent}
            active={activeHref === '/signin'}
          />
        </div>
      </div>
    </div>
  );
}

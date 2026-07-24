'use client';

import { useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { X, ClipboardList, Columns2, Grid, User } from 'lucide-react';
import { useUser } from '@/lib/use-user';
import { colors as uiTokens } from '@/components/ui/tokens';
import IconButton from '@/components/ui/IconButton';

// Left navigation drawer (nav IA — 2026-07-08-nav-drawer-design.md). Global, growing
// navigation lives here, opened from the header logo, so the team header isn't crowded and new
// views (Phase E) have a home. The primary interaction (team switcher) stays in the header —
// hidden nav is for secondary/global items only (NN/G research). Scrim tap + Esc + close button
// dismiss; focus is trapped while open and restored to the trigger on close; body scroll locks.

function NavItem({
  href,
  icon,
  label,
  disabled,
  onNavigate,
  accent,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  disabled: boolean;
  onNavigate: (href: string) => void;
  accent: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-disabled={disabled}
      onClick={(e) => {
        // Navigate through the parent's useTransition guard instead of Link's own
        // navigation, so the drawer stays open until the transition commits — see
        // the same pattern in NavSwitcher.
        e.preventDefault();
        if (disabled) return;
        onNavigate(href);
      }}
      aria-current={active ? 'page' : undefined}
      className="flex items-center gap-3 px-4 py-3"
      style={{
        touchAction: 'manipulation',
        pointerEvents: disabled ? 'none' : undefined,
        opacity: disabled ? 0.5 : 1,
        ...(active
          ? {
              background: `${accent}1F`,
              borderLeft: `3px solid ${accent}`,
              color: uiTokens.textPrimary,
            }
          : { color: uiTokens.textSecondary, borderLeft: '3px solid transparent' }),
      }}>
      <span style={{ color: active ? accent : uiTokens.textMuted, display: 'inline-flex' }}>
        {icon}
      </span>
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
  const router = useRouter();
  // Navigation is wrapped in a transition so the drawer stays open — and its links
  // disabled — until the destination is ready, instead of closing immediately and
  // flashing the still-mounted old page. See the same pattern in NavSwitcher.
  const [isPending, startTransition] = useTransition();
  const wasPending = useRef(false);
  // Legitimate effect: useTransition has no completion callback, only the isPending value to
  // observe changing across renders — there's no derived-render equivalent.
  useEffect(() => {
    if (wasPending.current && !isPending) {
      onClose();
    }
    wasPending.current = isPending;
  }, [isPending, onClose]);
  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };
  // Which destination is current: compare/archive/sign-in when on those routes, otherwise
  // the depth charts (home + team pages). Drives the active highlight consistently across
  // routes.
  const pathname = usePathname();
  const { user } = useUser();
  const activeHref = pathname?.startsWith('/compare')
    ? '/compare'
    : pathname?.startsWith('/uniforms')
      ? '/uniforms'
      : pathname?.startsWith('/signin')
        ? '/signin'
        : '/';
  // Carry the current page as ?next= so signing in (magic link) returns the user here, not to
  // the sign-in page. The confirm route threads it into the post-login redirect.
  const signInHref =
    pathname && pathname !== '/signin' ? `/signin?next=${encodeURIComponent(pathname)}` : '/signin';

  // Legitimate effect: focus trap + body-scroll-lock are DOM/document-level mutations with no
  // derived-render equivalent.
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
        style={{ position: 'absolute', inset: 0, background: uiTokens.scrim }}
      />
      <div
        ref={panelRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          // Widen by the left inset (not just cap at 82vw/320px) so the notch/rounded-corner
          // safe area doesn't eat into the usable content width — same env() pattern as the
          // bottom safe-area fix (#87), applied to the drawer's edge instead of a page bottom.
          width:
            'min(calc(82vw + env(safe-area-inset-left)), calc(320px + env(safe-area-inset-left)))',
          background: uiTokens.bgDrawer,
          borderRight: `1px solid ${uiTokens.borderDrawer}`,
          paddingTop: 'max(env(safe-area-inset-top), 16px)',
          paddingLeft: 'env(safe-area-inset-left)',
          display: 'flex',
          flexDirection: 'column',
        }}>
        <div className="flex items-center justify-between px-4 pb-3">
          <span
            className="text-base font-bold tracking-widest"
            style={{ color: uiTokens.textPrimary }}>
            depth
          </span>
          <IconButton
            variant="plain"
            onClick={onClose}
            ariaLabel="Close navigation"
            icon={<X size={18} color={uiTokens.textMuted} />}
          />
        </div>
        <nav className="flex flex-col flex-1">
          <NavItem
            href="/"
            icon={<ClipboardList size={19} />}
            label="Depth charts"
            disabled={isPending}
            onNavigate={navigate}
            accent={accent}
            active={activeHref === '/'}
          />
          <NavItem
            href="/compare"
            icon={<Columns2 size={19} />}
            label="Compare teams"
            disabled={isPending}
            onNavigate={navigate}
            accent={accent}
            active={activeHref === '/compare'}
          />
          <NavItem
            href="/uniforms"
            icon={<Grid size={19} />}
            label="Uniform archive"
            disabled={isPending}
            onNavigate={navigate}
            accent={accent}
            active={activeHref === '/uniforms'}
          />
        </nav>
        {/* Account lives at the bottom — a link to the sign-in / settings page, not an
            inline form. Signing in is opt-in (Phase C, auth pass 1). Bottom safe-area inset
            keeps the sign-in button clear of the home indicator in standalone PWA mode, same
            max(env(...), fallback) pattern as the bottom safe-area fix (#87). */}
        <div
          style={{
            borderTop: `1px solid ${uiTokens.borderDrawer}`,
            paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
          }}>
          <NavItem
            href={signInHref}
            icon={<User size={19} />}
            label={user ? 'Account' : 'Sign in'}
            disabled={isPending}
            onNavigate={navigate}
            accent={accent}
            active={activeHref === '/signin'}
          />
        </div>
      </div>
    </div>
  );
}

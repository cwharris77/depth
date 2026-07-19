import DepthMark from '@/components/DepthMark';
import { colors as uiTokens } from '@/components/ui/tokens';

// Route-level fallback for /team/[id] (loading.md): Next.js prefetches and shows this
// immediately on navigation, wrapping page.tsx in a Suspense boundary. Mirrors
// DepthChartField's header/field structure at low fidelity (no team colors known yet)
// so the swap-in doesn't jump the layout — see the "Janky page navigation" ticket. Uses
// DepthMark (non-interactive, no onClick) so its size always matches the real header's.
export default function Loading() {
  return (
    <div
      className="flex flex-col mx-auto w-full animate-pulse"
      style={{
        height: '100dvh',
        maxWidth: 720,
        overflow: 'hidden',
        background: uiTokens.bg,
      }}>
      <div
        className="px-5 pb-3"
        style={{ flex: '0 0 auto', paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
        <div className="flex items-center justify-between">
          <DepthMark color={uiTokens.textMuted} />
          <div
            className="rounded-full"
            style={{ width: 140, height: 30, background: uiTokens.surfaceChip }}
          />
        </div>
        <div
          className="rounded-xl mt-6"
          style={{ width: 180, height: 34, background: uiTokens.surfaceChip }}
        />
      </div>

      <div
        className="px-3 flex flex-col"
        style={{
          flex: '1 1 0',
          minHeight: 0,
          paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        }}>
        <div
          className="relative w-full rounded-2xl overflow-hidden"
          style={{
            flex: '1 1 0',
            minHeight: 0,
            background:
              'linear-gradient(180deg, #1e3d10 0%, #2d5a1b 40%, #2d5a1b 60%, #1e3d10 100%)',
            boxShadow: `inset 0 0 60px ${uiTokens.scrimLight}, 0 4px 32px ${uiTokens.scrim}`,
          }}
        />
      </div>
    </div>
  );
}

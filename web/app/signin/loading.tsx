import { colors as uiTokens } from '@/components/ui/tokens';

// Route-level fallback for /signin (loading.md): Next.js wraps page.tsx in a Suspense
// boundary using this file. page.tsx reads searchParams and awaits listTeams (both
// server-side, before AccountView ever mounts) with nothing to paint in the meantime —
// see the "Pre-render and loading gaps" ticket. Mirrors signin/page.tsx's own shell
// (back link, centered logo+wordmark) plus AccountView's default signed-out form
// (heading, email input, button, privacy line) at low fidelity, so the swap-in doesn't
// jump the layout.
export default function Loading() {
  return (
    <main className="flex-1 flex flex-col animate-pulse" style={{ background: uiTokens.bg }}>
      <div className="mx-auto w-full max-w-md px-5 py-12">
        <div
          className="mb-6 rounded-md"
          style={{ width: 56, height: 16, background: uiTokens.surfaceChip }}
        />

        <div className="mx-auto mb-8 flex w-fit items-center gap-2">
          <div
            className="rounded-full"
            style={{ width: 36, height: 36, background: uiTokens.surfaceChip }}
          />
          <div
            className="rounded-md"
            style={{ width: 64, height: 20, background: uiTokens.surfaceChip }}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div
            className="rounded-md"
            style={{ width: 110, height: 28, background: uiTokens.surfaceChip }}
          />
          <div className="flex flex-col gap-2">
            <div className="rounded-xl" style={{ height: 46, background: uiTokens.surfaceChip }} />
            <div className="rounded-xl" style={{ height: 46, background: uiTokens.surfaceChip }} />
          </div>
          <div
            className="rounded-md"
            style={{ width: 200, height: 11, background: uiTokens.surfaceChip }}
          />
        </div>
      </div>
    </main>
  );
}

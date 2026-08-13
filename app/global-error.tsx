'use client';

import { colors as uiTokens } from '@/components/ui/tokens';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        className="min-h-full flex flex-col items-center justify-center text-center px-6"
        style={{
          background: uiTokens.bg,
          color: uiTokens.textPrimary,
        }}>
        <p
          className="text-[10px] font-semibold tracking-widest"
          style={{ color: uiTokens.textMuted }}>
          ERROR
        </p>
        <h1 className="text-2xl font-black mt-2" style={{ letterSpacing: '-0.02em' }}>
          Something went wrong
        </h1>
        <p className="text-sm mt-2" style={{ color: 'rgba(240,244,255,0.65)' }}>
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => reset()}
          className="mt-6 px-4 py-2 rounded-xl text-sm font-bold"
          style={{
            background: uiTokens.borderDefault,
            color: uiTokens.textPrimary,
          }}>
          Retry
        </button>
      </body>
    </html>
  );
}

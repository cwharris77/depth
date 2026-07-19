'use client';

import { useState } from 'react';
import { colors } from './tokens';

const FALLBACK = (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    style={{ width: '60%', height: '60%', opacity: 0.6 }}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8v1H4z" />
  </svg>
);

type AvatarProps = {
  photoUrl?: string;
  name?: string;
  size?: number;
  ringColor?: string;
  fillColor?: string;
  iconColor?: string;
};

// Circular player photo with a silhouette fallback (used when photoUrl is missing or
// 404s — reset per player by passing a fresh `key` from the caller). Two contexts: the
// player-card avatar (large, team-colored ring + fill) and the search-result avatar
// (small, neutral chrome).
export default function Avatar({
  photoUrl,
  name = '',
  size = 72,
  ringColor,
  fillColor = colors.surfaceInput,
  iconColor = colors.textMuted,
}: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const showPhoto = Boolean(photoUrl) && !errored;
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        border: ringColor ? `2px solid ${ringColor}` : `1px solid ${colors.surfaceChipHover}`,
        background: fillColor,
        color: iconColor,
      }}>
      {showPhoto ? (
        <img
          src={photoUrl}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        FALLBACK
      )}
    </div>
  );
}

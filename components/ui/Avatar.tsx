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
  // 'circle' (default) is the framed round chip used by search results (TeamRail,
  // NavSwitcher). 'crop' drops the ring/circle clip entirely and crops to a taller
  // head-and-shoulders frame via object-position — the PlayerCard's Madden Ultimate
  // Team-style unframed avatar (source ESPN headshots aren't re-croppable, so this is
  // pure CSS framing over the same image).
  shape?: 'circle' | 'crop';
};

// Player photo with a silhouette fallback (used when photoUrl is missing or 404s —
// reset per player by passing a fresh `key` from the caller). Three contexts: the
// player-card avatar (large, unframed head-and-shoulders crop), and the search-result
// avatars in TeamRail/NavSwitcher (small, circular, neutral chrome).
export default function Avatar({
  photoUrl,
  name = '',
  size = 72,
  ringColor,
  fillColor = colors.surfaceInput,
  iconColor = colors.textMuted,
  shape = 'circle',
}: AvatarProps) {
  const [errored, setErrored] = useState(false);
  const showPhoto = Boolean(photoUrl) && !errored;
  const isCrop = shape === 'crop';
  // Taller-than-wide box so object-position can crop the shoulders/torso off an ESPN
  // headshot and hold on the head — cover fills the box, top-anchored.
  const height = isCrop ? Math.round(size * 1.2) : size;
  return (
    <div
      className={`flex shrink-0 items-center justify-center ${isCrop ? '' : 'overflow-hidden rounded-full'}`}
      style={{
        width: size,
        height,
        border: isCrop
          ? undefined
          : ringColor
            ? `2px solid ${ringColor}`
            : `1px solid ${colors.surfaceChipHover}`,
        background: isCrop ? undefined : fillColor,
        color: iconColor,
      }}>
      {showPhoto ? (
        <img
          src={photoUrl}
          alt={name}
          width={size}
          height={height}
          className={`h-full w-full object-cover ${isCrop ? 'object-top' : ''}`}
          onError={() => setErrored(true)}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{ background: fillColor, borderRadius: isCrop ? 0 : '9999px' }}>
          {FALLBACK}
        </div>
      )}
    </div>
  );
}

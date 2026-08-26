'use client';

// PlayerCard's top row: avatar, jersey number watermark, name/position/status, and
// the share/close actions. Share state (copied/shareFailed) resets when player.id
// changes, adjusted during render (comparing against prevPlayerId) rather than in an
// effect — safe because it only fires on an actual prop change, never during
// hydration. No prop-mirror effect needed.
import { readableTextOn } from '@/lib/utils/colors';
import { positionFullName } from '@/lib/utils/team/positions';
import { playerDeepLinkPath } from '@/lib/utils/depth-chart/share';
import type { Player, TeamColors } from '@/lib/types';
import { AlertCircle, Check, Share2 } from 'lucide-react';
import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import CloseButton from '@/components/ui/CloseButton';
import IconButton from '@/components/ui/IconButton';
import { colors as uiTokens } from '@/components/ui/tokens';

interface PlayerCardHeaderProps {
  player: Player;
  teamId: string;
  colors: TeamColors;
  onClose: () => void;
}

export default function PlayerCardHeader({
  player,
  teamId,
  colors,
  onClose,
}: PlayerCardHeaderProps) {
  const accent = colors.uiAccent;
  const [copied, setCopied] = useState(false);
  // Set when the clipboard write itself fails (e.g. permission denied, insecure
  // context) — distinct from the user simply dismissing the native share sheet,
  // which is expected and not an error worth surfacing (DEP-131).
  const [shareFailed, setShareFailed] = useState(false);
  const [prevPlayerId, setPrevPlayerId] = useState(player.id);
  if (player.id !== prevPlayerId) {
    setPrevPlayerId(player.id);
    setCopied(false);
    setShareFailed(false);
  }

  const handleShare = async () => {
    const url = window.location.origin + playerDeepLinkPath(teamId, player.id);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `${player.name} · The Sticks`, url });
      } catch {
        // user dismissed the share sheet, or it's unavailable — nothing to do
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked (insecure context / permission) — surface it rather than
      // leaving the click looking like a no-op (DEP-131)
      setShareFailed(true);
      setTimeout(() => setShareFailed(false), 1500);
    }
  };

  return (
    <div className="flex items-start justify-between px-6 pt-4 pb-2">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <Avatar
          key={player.id}
          photoUrl={player.photoUrl}
          name={player.name}
          size={72}
          ringColor={accent}
          fillColor={colors.primary}
          iconColor={readableTextOn(colors.primary)}
        />
        <div className="min-w-0 flex-1">
          <div
            className="text-6xl font-black leading-none"
            style={{
              color: `${accent}26`,
              letterSpacing: '-0.03em',
            }}>
            #{player.number}
          </div>
          <div
            className="mt-2 text-2xl font-black leading-tight"
            style={{
              color: uiTokens.textPrimary,
              letterSpacing: '-0.01em',
            }}>
            {player.name}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge variant="position" accent={accent}>
              {player.position}
            </Badge>
            <span className="text-xs font-medium" style={{ color: uiTokens.textMuted }}>
              {positionFullName(player.position)}
            </span>
            <Badge variant="status" status={player.status} accent={accent} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1 shrink-0">
        <IconButton
          variant="ghost"
          active={copied}
          accent={accent}
          onClick={handleShare}
          ariaLabel={copied ? 'Link copied' : shareFailed ? "Couldn't copy link" : 'Share player'}
          icon={
            copied ? (
              <Check size={18} color={accent} strokeWidth={3} />
            ) : shareFailed ? (
              <AlertCircle size={18} color={uiTokens.danger} />
            ) : (
              <Share2 size={18} color={uiTokens.textMuted} />
            )
          }
        />
        <CloseButton onClick={onClose} ariaLabel="Close player card" />
      </div>
    </div>
  );
}

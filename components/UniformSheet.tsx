'use client';

import Image from 'next/image';
import { Check, X } from 'lucide-react';
import type { Uniform } from '@/lib/types';
import { formatUniformYears } from '@/lib/uniforms';
import JerseySwatch from './JerseySwatch';
import IconButton from './ui/IconButton';
import { colors as uiTokens } from '@/components/ui/tokens';

// The uniform picker's contents (rendered inside BottomSheet). One tappable row per
// kit — jersey thumbnail, name, year range, and a check on the active one. Selecting a
// kit recolors the field live behind the sheet (the parent applies the kit's colors),
// so the sheet stays open: you can hop between kits and watch the field change.
export default function UniformSheet({
  uniforms,
  activeId,
  accent,
  onSelect,
  onClose,
}: {
  uniforms: Uniform[];
  activeId: string;
  accent: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col" style={{ maxHeight: '100%' }}>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h2 className="text-base font-black" style={{ color: uiTokens.textPrimary }}>
          Uniforms
        </h2>
        <IconButton
          icon={<X size={16} color={uiTokens.textMuted} />}
          variant="plain"
          size="sm"
          onClick={onClose}
          ariaLabel="Close"
        />
      </div>

      <div className="px-3 pb-3 overflow-y-auto">
        {uniforms.map((u) => {
          const isActive = u.id === activeId;
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => onSelect(u.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left"
              style={{
                touchAction: 'manipulation',
                background: isActive ? `${accent}1a` : 'transparent',
                border: `1px solid ${isActive ? `${accent}66` : 'transparent'}`,
              }}>
              <div
                className="shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  background: uiTokens.surfaceRaised,
                  border: `1px solid ${uiTokens.borderStrong}`,
                }}>
                {u.imagePath ? (
                  <Image
                    src={u.imagePath}
                    alt={u.name}
                    width={44}
                    height={44}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <JerseySwatch colors={u.colors} size={34} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate" style={{ color: uiTokens.textPrimary }}>
                  {u.name}
                </div>
                <div className="text-[11px]" style={{ color: uiTokens.textMuted }}>
                  {formatUniformYears(u)}
                </div>
              </div>
              {isActive && <Check size={16} color={accent} strokeWidth={3} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

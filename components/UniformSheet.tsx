'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Check, X } from 'lucide-react';
import { motion, type PanInfo } from 'framer-motion';
import type { Uniform } from '@/lib/types';
import { formatUniformYears } from '@/lib/uniforms';
import JerseySwatch from './JerseySwatch';
import IconButton from './ui/IconButton';
import { colors as uiTokens } from '@/components/ui/tokens';

// The uniform picker's contents (rendered inside BottomSheet). A horizontal swipeable
// carousel replaces the old vertical row-list: each kit is a full-width card; swiping
// left/right pages between them. Selecting a kit recolors the field live behind the
// sheet (the parent applies the kit's colors), so the sheet stays open: you can swipe
// between kits and watch the field change.
//
// Snap behavior: releasing a drag mid-swipe settles on the nearest card, matching the
// drag/settle pattern used elsewhere in this codebase (see PlayerCard.tsx's reorder
// drag) rather than inventing a new gesture library dependency.
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
  // Track the current carousel index, initialised to the active kit's position.
  const activeIndex = uniforms.findIndex((u) => u.id === activeId);
  const [currentIndex, setCurrentIndex] = useState(activeIndex >= 0 ? activeIndex : 0);
  // The container ref gives us the card width for snap calculations.
  const containerRef = useRef<HTMLDivElement>(null);

  // The total drag offset in pixels. We track this ourselves so we can animate to the
  // snap target with a spring, rather than fighting framer-motion's velocity-based
  // inertia (which doesn't give us a clean snap-to-card).
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Card width = container width (full-width cards). Recalculated on every drag start
  // so it adapts to resize.
  const cardWidth = containerRef.current?.clientWidth ?? 320;

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDrag = useCallback(
    (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
      setDragX(info.offset.x);
    },
    []
  );

  const handleDragEnd = useCallback(
    (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
      setIsDragging(false);
      // Determine the snap target: if the velocity is high enough, skip a card;
      // otherwise snap to the nearest card based on offset.
      const threshold = cardWidth * 0.25;
      let targetIndex = currentIndex;

      if (info.offset.x < -threshold || info.velocity.x < -300) {
        targetIndex = Math.min(currentIndex + 1, uniforms.length - 1);
      } else if (info.offset.x > threshold || info.velocity.x > 300) {
        targetIndex = Math.max(currentIndex - 1, 0);
      }

      if (targetIndex !== currentIndex) {
        setCurrentIndex(targetIndex);
        onSelect(uniforms[targetIndex].id);
      }

      // Reset drag offset — the card position is now driven by currentIndex.
      setDragX(0);
    },
    [currentIndex, cardWidth, uniforms, onSelect]
  );

  // The translateX for the carousel track: base offset from currentIndex, plus the
  // live drag offset while the user is swiping.
  const trackX = -currentIndex * cardWidth + dragX;

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

      {/* Carousel track */}
      <div ref={containerRef} className="relative overflow-hidden" style={{ touchAction: 'pan-y' }}>
        <motion.div
          className="flex"
          style={{ x: trackX }}
          drag="x"
          dragConstraints={{ left: -(uniforms.length - 1) * cardWidth, right: 0 }}
          dragElastic={0.15}
          onDragStart={handleDragStart}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          animate={{ x: -currentIndex * cardWidth }}
          transition={{ type: 'spring', stiffness: 360, damping: 38 }}>
          {uniforms.map((u) => {
            const isActive = u.id === activeId;
            return (
              <div
                key={u.id}
                className="shrink-0 flex flex-col items-center px-5 pb-4"
                style={{ width: cardWidth || '100%' }}>
                {/* Kit thumbnail — larger than the old row to fill the card */}
                <div
                  className="rounded-xl overflow-hidden flex items-center justify-center mb-4"
                  style={{
                    width: '100%',
                    maxWidth: 220,
                    aspectRatio: '3 / 4',
                    background: uiTokens.surfaceRaised,
                    border: `1px solid ${isActive ? `${accent}66` : uiTokens.borderStrong}`,
                  }}>
                  {u.imagePath ? (
                    <Image
                      src={u.imagePath}
                      alt={u.name}
                      width={220}
                      height={293}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <JerseySwatch colors={u.colors} size={160} />
                  )}
                </div>

                {/* Kit name and year range */}
                <div className="text-center">
                  <div className="text-base font-bold" style={{ color: uiTokens.textPrimary }}>
                    {u.name}
                  </div>
                  <div className="text-xs mt-1" style={{ color: uiTokens.textMuted }}>
                    {formatUniformYears(u)}
                  </div>
                </div>

                {/* Active indicator */}
                {isActive && (
                  <div
                    className="mt-3 flex items-center gap-1.5 rounded-full px-3 py-1"
                    style={{
                      background: `${accent}1a`,
                      border: `1px solid ${accent}55`,
                    }}>
                    <Check size={14} color={accent} strokeWidth={3} />
                    <span className="text-[11px] font-bold" style={{ color: accent }}>
                      Active
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Page dots indicator */}
      {uniforms.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-3">
          {uniforms.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                setCurrentIndex(i);
                onSelect(u.id);
              }}
              className="rounded-full transition-all"
              style={{
                width: i === currentIndex ? 20 : 6,
                height: 6,
                background: i === currentIndex ? accent : uiTokens.textFaintest,
                touchAction: 'manipulation',
              }}
              aria-label={`Select ${u.name}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

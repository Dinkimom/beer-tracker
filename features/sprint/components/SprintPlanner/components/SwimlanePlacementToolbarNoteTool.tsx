'use client';

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';

import { useEffect, useRef, useState } from 'react';

import { useEscapeKey } from '@/hooks/useEscapeKey';

import { resolveNoteColorPopupOpen } from '../utils/swimlanePlacementToolbar';

import { SwimlanePlacementToolbarButton } from './SwimlanePlacementToolbarButton';
import { SwimlanePlacementToolbarNoteColors } from './SwimlanePlacementToolbarNoteColors';

interface SwimlanePlacementToolbarNoteToolProps {
  active: boolean;
  color: StickyNoteColor;
  onColorChange: (color: StickyNoteColor) => void;
  onSelect: () => void;
}

export function SwimlanePlacementToolbarNoteTool({
  active,
  color,
  onColorChange,
  onSelect,
}: SwimlanePlacementToolbarNoteToolProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const colorPopupOpen = popupOpen && active;

  useEffect(() => {
    if (!colorPopupOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }
      setPopupOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [colorPopupOpen]);
  // Safari: without preventDefault, Escape exits fullscreen.
  useEscapeKey(() => setPopupOpen(false), {
    capture: true,
    enabled: colorPopupOpen,
    preventDefault: true,
    stopPropagation: true,
  });

  return (
    <div ref={rootRef} className="relative">
      <SwimlanePlacementToolbarButton
        active={active}
        expanded={colorPopupOpen}
        noteColor={color}
        showSeparatorBefore={false}
        tool="comment"
        onSelect={() => {
          setPopupOpen(
            resolveNoteColorPopupOpen({
              commentWasActive: active,
              popupWasOpen: popupOpen,
              selectedTool: 'comment',
            })
          );
          onSelect();
        }}
      />
      {colorPopupOpen ? (
        <SwimlanePlacementToolbarNoteColors
          value={color}
          onChange={(nextColor) => {
            onColorChange(nextColor);
            setPopupOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

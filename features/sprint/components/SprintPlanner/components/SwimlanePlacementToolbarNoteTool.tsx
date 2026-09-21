'use client';

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';

import { useEffect, useRef, useState } from 'react';

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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.stopPropagation();
      setPopupOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [colorPopupOpen]);

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

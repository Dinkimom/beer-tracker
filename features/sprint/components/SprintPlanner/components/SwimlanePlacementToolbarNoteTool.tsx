'use client';

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';

import { useRef, useState } from 'react';

import { OWNED_ESCAPE } from '@/hooks/useEscapeKey';
import { usePopoverDismiss } from '@/hooks/usePopoverDismiss';

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

  usePopoverDismiss(() => setPopupOpen(false), {
    enabled: colorPopupOpen,
    escape: OWNED_ESCAPE,
    refs: [rootRef],
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

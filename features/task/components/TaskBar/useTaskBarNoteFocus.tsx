'use client';

import type { StickyNoteColor } from '@/lib/comments/stickyNoteColor';
import type { Developer } from '@/types';
import type { CSSProperties, ReactNode, RefObject } from 'react';

import { useRef, useState } from 'react';

import { TaskBarNoteFocusEditor } from './TaskBarNoteFocusEditor';

// Через opacity: слой карточки сам выставляет visibility: visible и перебил бы hidden.
const HIDDEN_WHILE_FOCUSED: CSSProperties = { opacity: 0, pointerEvents: 'none' };

/** Режим фокуса заметки для TaskBar: состояние, скрытие листа на доске и портал редактора. */
export function useTaskBarNoteFocus(input: {
  developers: readonly Developer[];
  inlineTitleEditor?: {
    color?: StickyNoteColor;
    placeholder?: string;
    value: string;
    onCancel?: () => void;
    onChange: (value: string) => void;
    onColorChange?: (color: StickyNoteColor) => void;
    onSubmit?: () => void;
  };
  isStickyNoteCard: boolean;
}): {
  focusEditor: ReactNode;
  rootRef: RefObject<HTMLDivElement | null>;
  rootStyle: CSSProperties | null;
  onNoteExpand?: () => void;
} {
  const { developers, inlineTitleEditor, isStickyNoteCard } = input;
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  // Редактор закрыли снаружи — фокус-режим не должен пережить его и открыться на следующей правке.
  if (isOpen && !inlineTitleEditor) {
    setIsOpen(false);
  }
  const editor = isStickyNoteCard && isOpen ? inlineTitleEditor : undefined;

  return {
    focusEditor: editor ? (
      <TaskBarNoteFocusEditor
        developers={developers}
        editor={editor}
        getAnchor={() =>
          rootRef.current?.querySelector<HTMLElement>('.sticky-note-paper') ?? rootRef.current
        }
        onCollapse={() => {
          setIsOpen(false);
          requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>('.ProseMirror')?.focus());
        }}
      />
    ) : null,
    onNoteExpand: isStickyNoteCard ? () => setIsOpen(true) : undefined,
    rootRef,
    // Пока заметка развёрнута по центру, её место на доске пустует.
    rootStyle: editor ? HIDDEN_WHILE_FOCUSED : null,
  };
}

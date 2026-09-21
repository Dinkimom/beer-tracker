import type { TaskCardVariant } from '@/types';
import type { Dispatch, SetStateAction } from 'react';

import { useEffect, useLayoutEffect, useRef } from 'react';

import {
  adjustTaskCardTitleEditorHeight,
  syncTaskCardTitleFittedLineCount,
  syncTaskCardTitleOverflowFlag,
  TASK_CARD_TITLE_DATA_ATTR,
} from './taskCardContentHelpers';

export function useTaskCardTitleEditorEffects({
  inlineTitleEditor,
  maxLines,
  pendingTitleEditorSelectionRef,
  setMaxLines,
  textRef,
  titleFitKey,
  titleInputRef,
  variant,
  wrapperRef,
}: {
  inlineTitleEditor?: { value: string };
  maxLines: number;
  pendingTitleEditorSelectionRef: React.MutableRefObject<{ end: number; start: number } | null>;
  setMaxLines: Dispatch<SetStateAction<number>>;
  textRef: React.RefObject<HTMLDivElement | null>;
  titleFitKey: string;
  titleInputRef: React.RefObject<HTMLTextAreaElement | null>;
  variant: TaskCardVariant;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}): void {
  const hasAutoSelectedTitleRef = useRef(false);

  useEffect(() => {
    if (!inlineTitleEditor) {
      hasAutoSelectedTitleRef.current = false;
      return;
    }
    if (hasAutoSelectedTitleRef.current) return;
    const titleInput = titleInputRef.current;
    if (!titleInput) return;
    hasAutoSelectedTitleRef.current = true;
    requestAnimationFrame(() => {
      titleInput.focus();
      titleInput.select();
      adjustTaskCardTitleEditorHeight(titleInput, wrapperRef.current);
    });
  }, [inlineTitleEditor, titleInputRef, wrapperRef]);

  useEffect(() => {
    if (!inlineTitleEditor) return;
    adjustTaskCardTitleEditorHeight(titleInputRef.current, wrapperRef.current);
  }, [inlineTitleEditor, inlineTitleEditor?.value, maxLines, titleInputRef, wrapperRef]);

  useLayoutEffect(() => {
    if (!inlineTitleEditor) return;
    const pending = pendingTitleEditorSelectionRef.current;
    if (!pending) return;
    const titleInput = titleInputRef.current;
    if (!titleInput) return;
    pendingTitleEditorSelectionRef.current = null;
    titleInput.setSelectionRange(pending.start, pending.end);
  }, [inlineTitleEditor, inlineTitleEditor?.value, pendingTitleEditorSelectionRef, titleInputRef]);

  useLayoutEffect(() => {
    if (variant !== 'swimlane') return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const update = () => {
      const text = textRef.current ?? titleInputRef.current;
      if (!text) return;
      const fitted = syncTaskCardTitleFittedLineCount({ textEl: text, wrapperEl: wrapper });
      if (fitted != null) {
        setMaxLines((prev) => (prev === fitted ? prev : fitted));
      }
      const titleEl = textRef.current;
      if (titleEl?.hasAttribute(TASK_CARD_TITLE_DATA_ATTR)) {
        syncTaskCardTitleOverflowFlag({ textEl: titleEl, wrapperEl: wrapper });
      }
      if (inlineTitleEditor) {
        adjustTaskCardTitleEditorHeight(titleInputRef.current, wrapper);
      }
    };

    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
    update();
    return () => ro.disconnect();
  }, [inlineTitleEditor, setMaxLines, textRef, titleFitKey, titleInputRef, variant, wrapperRef]);
}

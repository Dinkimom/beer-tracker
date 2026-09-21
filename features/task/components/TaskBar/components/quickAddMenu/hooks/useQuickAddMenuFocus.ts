'use client';

import type { QuickAddMode } from '../types';

import { useLayoutEffect, type RefObject } from 'react';

interface UseQuickAddMenuFocusParams {
  commentInputRef: RefObject<HTMLTextAreaElement | null>;
  diagramNameRef?: RefObject<HTMLInputElement | null>;
  enabled?: boolean;
  imageCaptionRef?: RefObject<HTMLInputElement | null>;
  imageDropzoneRef?: RefObject<HTMLElement | null>;
  imageUrl?: string;
  isContentReady: boolean;
  isInitialLoading: boolean;
  mode: QuickAddMode;
  newTaskInputRef: RefObject<HTMLTextAreaElement | null>;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

export function resolveQuickAddMenuFocusTarget(input: {
  commentInput: HTMLTextAreaElement | null;
  diagramNameInput?: HTMLInputElement | null;
  imageCaptionInput?: HTMLInputElement | null;
  imageDropzone?: HTMLElement | null;
  imageUrl?: string;
  mode: QuickAddMode;
  newTaskInput: HTMLTextAreaElement | null;
  searchInput: HTMLInputElement | null;
}): HTMLElement | null {
  if (input.mode === 'new') {
    return input.newTaskInput;
  }
  if (input.mode === 'comment') {
    return input.commentInput;
  }
  if (input.mode === 'diagram') {
    return input.diagramNameInput ?? null;
  }
  if (input.mode === 'image') {
    if (input.imageUrl) {
      return input.imageCaptionInput ?? input.imageDropzone ?? null;
    }
    return input.imageDropzone ?? input.imageCaptionInput ?? null;
  }
  if (input.mode === 'availability') {
    return null;
  }
  return input.searchInput;
}

export function focusQuickAddMenuInput(el: HTMLElement | null): void {
  if (!el) {
    return;
  }
  el.focus();
  if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) {
    return;
  }
  const length = el.value.length;
  el.setSelectionRange(length, length);
}

export function useQuickAddMenuFocus({
  commentInputRef,
  diagramNameRef,
  enabled = true,
  imageCaptionRef,
  imageDropzoneRef,
  imageUrl,
  isContentReady,
  isInitialLoading,
  mode,
  newTaskInputRef,
  searchInputRef,
}: UseQuickAddMenuFocusParams) {
  useLayoutEffect(() => {
    if (!enabled || !isContentReady || isInitialLoading) {
      return;
    }
    const focusTarget = () => {
      focusQuickAddMenuInput(
        resolveQuickAddMenuFocusTarget({
          commentInput: commentInputRef.current,
          diagramNameInput: diagramNameRef?.current,
          imageCaptionInput: imageCaptionRef?.current,
          imageDropzone: imageDropzoneRef?.current,
          imageUrl,
          mode,
          newTaskInput: newTaskInputRef.current,
          searchInput: searchInputRef.current,
        })
      );
    };
    focusTarget();
    const raf = requestAnimationFrame(focusTarget);
    return () => cancelAnimationFrame(raf);
  }, [
    commentInputRef,
    diagramNameRef,
    enabled,
    imageCaptionRef,
    imageDropzoneRef,
    imageUrl,
    isContentReady,
    isInitialLoading,
    mode,
    newTaskInputRef,
    searchInputRef,
  ]);
}

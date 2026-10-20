'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

import {
  getStickyNoteColorPopServerSnapshot,
  getStickyNoteColorPopSnapshot,
  playStickyNoteColorPop,
  shouldPlayStickyNoteColorPop,
  subscribeStickyNoteColorPop,
} from '@/features/comments/utils/stickyNoteColorPop';

/** true, пока играет scale-pop после смены stickyNoteColor. */
export function useStickyNoteColorPop(
  taskId: string,
  enabled: boolean,
  color: string | null | undefined
): boolean {
  const prevColorRef = useRef(color);
  const hasMountedRef = useRef(false);
  const poppingIds = useSyncExternalStore(
    subscribeStickyNoteColorPop,
    getStickyNoteColorPopSnapshot,
    getStickyNoteColorPopServerSnapshot
  );

  useEffect(() => {
    if (!enabled) {
      prevColorRef.current = color;
      return;
    }
    const previous = prevColorRef.current;
    prevColorRef.current = color;
    if (!shouldPlayStickyNoteColorPop(previous, color, hasMountedRef.current)) {
      hasMountedRef.current = true;
      return;
    }
    hasMountedRef.current = true;
    playStickyNoteColorPop(taskId);
  }, [color, enabled, taskId]);

  return enabled && poppingIds.has(taskId);
}

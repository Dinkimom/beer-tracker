'use client';

import { useSyncExternalStore } from 'react';

import {
  getStickyNoteExitServerSnapshot,
  getStickyNoteExitSnapshot,
  subscribeStickyNoteExit,
} from '@/features/comments/utils/stickyNoteExit';

export function useStickyNoteExiting(taskId: string): boolean {
  const exiting = useSyncExternalStore(
    subscribeStickyNoteExit,
    getStickyNoteExitSnapshot,
    getStickyNoteExitServerSnapshot
  );
  return exiting.has(taskId);
}

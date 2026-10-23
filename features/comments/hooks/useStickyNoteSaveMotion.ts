'use client';

import type { StickyNoteSaveMotion } from '@/features/comments/utils/stickyNoteSaveMotion';

import { useSyncExternalStore } from 'react';

import {
  getStickyNoteSaveMotionServerSnapshot,
  getStickyNoteSaveMotionSnapshot,
  subscribeStickyNoteSaveMotion,
} from '@/features/comments/utils/stickyNoteSaveMotion';

/** Какой отклик на сохранение сейчас играет на этой карточке. */
export function useStickyNoteSaveMotion(taskId: string): StickyNoteSaveMotion | undefined {
  const playing = useSyncExternalStore(
    subscribeStickyNoteSaveMotion,
    getStickyNoteSaveMotionSnapshot,
    getStickyNoteSaveMotionServerSnapshot
  );
  return playing.get(taskId);
}

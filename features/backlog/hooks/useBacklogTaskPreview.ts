'use client';

import { useState } from 'react';

import { previewBacklogTasks } from '../utils/backlogTaskPreview';

export function useBacklogTaskPreview<T>(tasks: readonly T[], resetKey: string) {
  const [openedKey, setOpenedKey] = useState<string | null>(null);
  const shownTasks = previewBacklogTasks(tasks, openedKey === resetKey);
  return {
    hiddenCount: tasks.length - shownTasks.length,
    shownTasks,
    onShowMore: () => setOpenedKey(resetKey),
  };
}

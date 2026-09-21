'use client';

import { useEffect } from 'react';

import { useRootStore } from '@/lib/layers';

import {
  isPlannerHistoryShortcutBlockedTarget,
  resolvePlannerHistoryShortcut,
} from './plannerHistoryKeyboard';

/**
 * Глобальные Cmd/Ctrl+Z и Cmd/Ctrl+Shift+Z для undo/redo плана.
 * Не срабатывает в полях ввода и когда `enabled === false` (канбан, редактор схемы).
 */
export function usePlannerHistoryKeyboardShortcuts(enabled = true): void {
  const { taskPositions: positionsStore } = useRootStore();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isPlannerHistoryShortcutBlockedTarget(event.target)) {
        return;
      }
      const action = resolvePlannerHistoryShortcut(event);
      if (!action) {
        return;
      }
      if (action === 'undo') {
        if (!positionsStore.canUndo) {
          return;
        }
        event.preventDefault();
        positionsStore.undo();
        return;
      }
      if (!positionsStore.canRedo) {
        return;
      }
      event.preventDefault();
      positionsStore.redo();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, positionsStore]);
}

'use client';

import type { SwimlanePlacementTool } from '@/lib/layers';

import { useEffect } from 'react';

import { useRootStore } from '@/lib/layers';

import { isPlannerHistoryShortcutBlockedTarget } from './plannerHistoryKeyboard';
import { resolvePlacementToolbarKeyboardAction } from './swimlanePlacementToolbarKeyboard';

/**
 * Escape → курсор; Cmd/Ctrl+1…N → инструмент тулбара.
 * Не срабатывает в полях ввода и поверх меню / редактора схемы / диалога.
 */
export function useSwimlanePlacementToolbarKeyboard(input: {
  availableTools: readonly SwimlanePlacementTool[];
  onSelectTool: (tool: SwimlanePlacementTool) => void;
}): void {
  const { sprintPlannerUi } = useRootStore();
  const { availableTools, onSelectTool } = input;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = resolvePlacementToolbarKeyboardAction({
        availableTools,
        defaultPrevented: event.defaultPrevented,
        event,
        fromEditableTarget: isPlannerHistoryShortcutBlockedTarget(event.target),
        hasBlockingOverlay: Boolean(
          sprintPlannerUi.contextMenu ||
            sprintPlannerUi.diagramEditorTaskId ||
            document.querySelector(
              '[data-confirm-dialog="true"], [data-planner-onboarding-dialog="true"]'
            )
        ),
        placementTool: sprintPlannerUi.placementTool,
      });
      if (!action) {
        return;
      }
      // Safari: without preventDefault, Escape exits fullscreen (collapses the window).
      event.preventDefault();
      onSelectTool(action);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [availableTools, onSelectTool, sprintPlannerUi]);
}

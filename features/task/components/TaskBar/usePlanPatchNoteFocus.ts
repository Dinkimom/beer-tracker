import type { Task } from '@/types';

import { useCallback, useEffect } from 'react';

import { useRootStore } from '@/lib/layers';

/**
 * Черновик-замена заметки и её оригинал: наведение на черновик ставит `planPatchNoteFocusTaskId`
 * (id оригинала), и обе карточки получают кольцо фокуса — как превью позиции и исходная карточка.
 * Черновик исчез под курсором (приняли / отклонили) — фокус снимаем, чтобы кольцо не залипло.
 * Для обычной карточки `hover` — тот же `onTaskHover`.
 */
export function usePlanPatchNoteFocus(
  task: Pick<Task, 'id' | 'pendingReplacesTaskId'>,
  onTaskHover: ((taskId: string | null) => void) | undefined
): { focused: boolean; hover: ((taskId: string | null) => void) | undefined } {
  const { sprintPlannerUi } = useRootStore();
  const replacesTaskId = task.pendingReplacesTaskId;
  const focusId = sprintPlannerUi.planPatchNoteFocusTaskId;

  useEffect(() => {
    if (!replacesTaskId) {
      return;
    }
    return () => {
      if (sprintPlannerUi.planPatchNoteFocusTaskId === replacesTaskId) {
        sprintPlannerUi.setPlanPatchNoteFocusTaskId(null);
      }
    };
  }, [replacesTaskId, sprintPlannerUi]);

  const hover = useCallback(
    (taskId: string | null) => {
      onTaskHover?.(taskId);
      sprintPlannerUi.setPlanPatchNoteFocusTaskId(taskId && replacesTaskId ? replacesTaskId : null);
    },
    [onTaskHover, replacesTaskId, sprintPlannerUi]
  );

  return {
    focused: focusId != null && (focusId === task.id || focusId === replacesTaskId),
    hover: replacesTaskId ? hover : onTaskHover,
  };
}

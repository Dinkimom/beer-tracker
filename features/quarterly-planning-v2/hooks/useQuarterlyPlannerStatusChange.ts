'use client';

import type { Task } from '@/types';
import type { SprintListItem } from '@/types/tracker';

import { useEffect, useState } from 'react';

import { useTransitionModal } from '@/features/sprint/components/SprintPlanner/hooks/useTransitionModal';
import { useTaskStatusOperations } from '@/features/sprint/hooks/useTaskOperations/hooks/useTaskStatusOperations';

/** Локальное состояние задач + смена статуса (переходы Tracker, модалка обязательных полей). */
export function useQuarterlyPlannerStatusChange(
  sourceTasks: Task[],
  sprints: SprintListItem[]
) {
  const [tasks, setTasks] = useState(sourceTasks);

  useEffect(() => {
    setTasks(sourceTasks);
  }, [sourceTasks]);

  const { changeStatus } = useTaskStatusOperations({ tasks, setTasks });
  const {
    transitionModal,
    handleStatusChangeWithModal,
    closeTransitionModal,
    handleTransitionSubmit,
  } = useTransitionModal({ tasks, changeStatus });

  return {
    tasks,
    sprints,
    transitionModal,
    handleStatusChangeWithModal,
    closeTransitionModal,
    handleTransitionSubmit,
  };
}

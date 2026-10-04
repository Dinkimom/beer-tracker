'use client';

import { useEffect } from 'react';

import { useBacklogSelection } from '../components/BacklogSelectionProvider';

/** Регистрирует задачи секции, чтобы «Выбрать все» и Shift-диапазон видели полный отфильтрованный список. */
export function useRegisterBacklogVisibleTasks(scopeId: string, tasks: readonly { id: string }[]) {
  const { setVisibleTasks } = useBacklogSelection();

  useEffect(() => {
    setVisibleTasks(
      scopeId,
      tasks.map((task) => task.id)
    );
    return () => setVisibleTasks(scopeId, []);
  }, [scopeId, setVisibleTasks, tasks]);
}

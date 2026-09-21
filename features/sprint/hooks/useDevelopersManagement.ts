import type { Developer, TaskPosition, Task } from '@/types';

import { useMemo } from 'react';

import { useDevelopersSortStorage, useDevelopersHiddenStorage, useDevelopersOrderStorage } from '@/hooks/useLocalStorage';
import { getTaskStoryPoints, getTaskTestPoints, isOriginalTask } from '@/lib/pointsUtils';
import { TEAM_SWIMLANE_ASSIGNEE_ID } from '@/lib/swimlane/teamSwimlaneAssignee';

import {
  applyAutomaticDeveloperSort,
  applyCustomDeveloperOrder,
} from './useDevelopersManagementHelpers';

/**
 * Хук для управления участниками (сортировка и скрытие)
 */
export function useDevelopersManagement(
  developers: Developer[],
  taskPositions: Map<string, TaskPosition>,
  tasksByAssignee: Map<string, Task[]>
) {
  const [sortBy, setSortBy] = useDevelopersSortStorage();
  const [hiddenIds, setHiddenIds] = useDevelopersHiddenStorage();
  const [customOrder, setCustomOrder] = useDevelopersOrderStorage();

  // Вычисляем статистику для каждого участника (мемоизируем)
  const developersWithStats = useMemo(() => {
    return developers.map((dev) => {
      const tasks = tasksByAssignee.get(dev.id) || [];

      // Подсчитываем SP и TP через единую точку подсчёта (по карточкам: dev → SP, QA → TP)
      const totalSP = tasks.filter(isOriginalTask).reduce((sum, task) => sum + getTaskStoryPoints(task), 0);
      const totalTP = tasks.filter((t) => t.team === 'QA').reduce((sum, task) => sum + getTaskTestPoints(task), 0);

      return {
        ...dev,
        taskCount: tasks.length,
        totalSP,
        totalTP,
      };
    });
  }, [developers, tasksByAssignee]);

  // Применяем сортировку
  const sorted = [...developersWithStats];

  // Если есть кастомный порядок и он актуален, используем его
  if (sortBy === 'custom' && customOrder.length > 0) {
    applyCustomDeveloperOrder(sorted, customOrder, developers);
  } else {
    applyAutomaticDeveloperSort(sorted, sortBy);
  }

  const sortedDevelopers = sorted;

  // Функция для обновления порядка через drag and drop
  const handleDragEnd = (activeId: string, overId: string | null) => {
    if (!overId || activeId === overId || activeId === TEAM_SWIMLANE_ASSIGNEE_ID) return;

    // Всегда используем текущий порядок из sortedDevelopers для drag and drop
    const currentOrder = sortedDevelopers.map(d => d.id);

    const oldIndex = currentOrder.indexOf(activeId);
    const newIndex = currentOrder.indexOf(overId);

    if (oldIndex === -1 || newIndex === -1) return;

    // Переключаемся на кастомный порядок, если еще не включен
    if (sortBy !== 'custom') {
      setSortBy('custom');
    }

    // Перемещаем элемент
    const newOrder = [...currentOrder];
    const [removed] = newOrder.splice(oldIndex, 1);
    newOrder.splice(newIndex, 0, removed);

    setCustomOrder(newOrder);
  };

  // Фильтруем скрытых участников
  const visibleDevelopers = sortedDevelopers.filter((dev) => !hiddenIds.has(dev.id));

  const toggleDeveloperVisibility = (developerId: string) => {
    setHiddenIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(developerId)) {
        newSet.delete(developerId);
      } else {
        newSet.add(developerId);
      }
      return newSet;
    });
  };

  const showAllDevelopers = () => {
    setHiddenIds(new Set());
  };

  const hideAllDevelopers = () => {
    setHiddenIds(new Set(developers.map((d) => d.id)));
  };

  return {
    visibleDevelopers,
    sortedDevelopers,
    sortBy,
    setSortBy,
    hiddenIds,
    toggleDeveloperVisibility,
    showAllDevelopers,
    hideAllDevelopers,
    handleDragEnd,
  };
}

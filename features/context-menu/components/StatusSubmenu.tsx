'use client';

import type { Task } from '@/types';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import { getTaskTrackerDisplayKey } from '@/features/task/utils/taskUtils';
import { type TransitionItem, getIssueTransitions } from '@/lib/beerTrackerApi';

import { ContextSubmenu } from './ContextSubmenu';
import { StatusSubmenuTransitionList } from './StatusSubmenuTransitionList';

interface StatusSubmenuProps {
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  isLoading: boolean;
  isOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  /** id перехода, по которому идёт запрос (лоадер на кнопке) */
  task: Task;
  taskIdForActions: string;
  onSelect: (transitionId: string, targetStatusKey?: string, targetStatusDisplay?: string, screenId?: string) => void;
  onToggle: () => void;
}

export function StatusSubmenu({
  task,
  taskIdForActions,
  isOpen,
  menuRef,
  buttonRef,
  isLoading,
  onToggle,
  onSelect,
}: StatusSubmenuProps) {
  const { t } = useI18n();
  const [statusTransitions, setStatusTransitions] = useState<TransitionItem[]>([]);
  const [isLoadingTransitions, setIsLoadingTransitions] = useState(false);
  const loadedForTaskIdRef = useRef<string | null>(null);

  // Загружаем доступные переходы статусов при открытии меню
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Повторно не запрашиваем для того же taskId (защита от цикла: не держим isLoading/statusTransitions в deps)
    if (loadedForTaskIdRef.current === taskIdForActions) {
      return;
    }
    loadedForTaskIdRef.current = taskIdForActions;

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setIsLoadingTransitions(true);
    });

    const loadTransitions = async () => {
      try {
        const transitions = await getIssueTransitions(getTaskTrackerDisplayKey(task));
        if (!cancelled) {
          const transitionsArray = Array.isArray(transitions) ? transitions : [];
          setStatusTransitions(transitionsArray);
          setIsLoadingTransitions(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load status transitions:', error);
          setStatusTransitions([]);
          setIsLoadingTransitions(false);
        }
      }
    };

    loadTransitions();

    return () => {
      cancelled = true;
      loadedForTaskIdRef.current = null;
    };
  }, [isOpen, task, taskIdForActions]);

  // Закрыли — следующее открытие загрузит переходы заново.
  useEffect(() => {
    if (!isOpen) {
      loadedForTaskIdRef.current = null;
    }
  }, [isOpen]);

  // Сброс данных только после unmount (конец exit-анимации), иначе на долю
  // секунды мелькает «Нет доступных переходов».
  const resetTransitions = useCallback(() => {
    setStatusTransitions([]);
    setIsLoadingTransitions(false);
  }, []);

  return (
    <ContextSubmenu
      bodyClassName="max-h-[400px]"
      buttonRef={buttonRef}
      disabled={isLoading}
      icon="refresh"
      isOpen={isOpen}
      label={t('sprintPlanner.contextMenu.changeStatus')}
      layoutKey={`${isLoadingTransitions}:${statusTransitions.length}`}
      menuRef={menuRef}
      panelClassName="min-w-[220px] max-w-[min(280px,calc(100vw-40px))]"
      value={task.originalStatusDisplay || task.originalStatus}
      onExited={resetTransitions}
      onToggle={onToggle}
    >
      <StatusSubmenuTransitionList
        isLoading={isLoading}
        isLoadingTransitions={isLoadingTransitions}
        statusTransitions={statusTransitions}
        task={task}
        onSelect={onSelect}
      />
    </ContextSubmenu>
  );
}

'use client';

import type { Task } from '@/types';

import { useRef, useEffect, useState } from 'react';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  CONTEXT_MENU_ITEM_ROW_ACTIVE,
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
  CONTEXT_MENU_ITEM_ROW_SUBMENU,
} from '@/features/context-menu/contextMenuClasses';
import { calculateSubmenuPosition } from '@/features/context-menu/utils/submenuPositioning';
import { getTaskTrackerDisplayKey } from '@/features/task/utils/taskUtils';
import { useOverlayPresence } from '@/hooks/useOverlayPresence';
import { type TransitionItem, getIssueTransitions } from '@/lib/beerTrackerApi';
import { DELAYS } from '@/utils/constants';

import { StatusSubmenuTransitionList } from './StatusSubmenuTransitionList';

interface StatusSubmenuProps {
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  isLoading: boolean;
  isOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  /** id перехода, по которому идёт запрос (лоадер на кнопке) */
  pendingTransitionId?: string | null;
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
  pendingTransitionId = null,
  onToggle,
  onSelect,
}: StatusSubmenuProps) {
  const { t } = useI18n();
  const statusMenuRef = useRef<HTMLDivElement>(null);
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

  const overlay = useOverlayPresence(isOpen);

  // Сброс данных только после unmount (конец exit-анимации), иначе на долю
  // секунды мелькает «Нет доступных переходов».
  useEffect(() => {
    if (!isOpen) {
      loadedForTaskIdRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (overlay.mounted) {
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setStatusTransitions([]);
      setIsLoadingTransitions(false);
    });
    return () => {
      cancelled = true;
    };
  }, [overlay.mounted]);

  // Позиционируем меню статусов
  useEffect(() => {
    if (isOpen && statusMenuRef.current && buttonRef.current && menuRef.current) {
      const menuElement = menuRef.current;

      const updatePosition = () => {
        if (!statusMenuRef.current || !buttonRef.current || !menuElement) return;

        const menuRect = menuElement.getBoundingClientRect();
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const subMenuRect = statusMenuRef.current.getBoundingClientRect();
        const statusMenuParent = statusMenuRef.current.parentElement;
        if (!statusMenuParent) return;
        const parentRect = statusMenuParent.getBoundingClientRect();

        const { left, top } = calculateSubmenuPosition(menuRect, buttonRect, subMenuRect, parentRect);

        statusMenuRef.current.style.left = `${left}px`;
        statusMenuRef.current.style.top = `${top}px`;
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          updatePosition();
          setTimeout(updatePosition, DELAYS.POSITIONING);
        });
      });
    }
  }, [isOpen, statusTransitions.length, isLoadingTransitions, menuRef, buttonRef]);

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        className={`${CONTEXT_MENU_ITEM_ROW_SUBMENU} ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${
          isOpen ? CONTEXT_MENU_ITEM_ROW_ACTIVE : ''
        } ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
        disabled={isLoading}
        type="button"
        variant="ghost"
        onClick={onToggle}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Icon
            aria-hidden
            className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400"
            name="refresh"
          />
          <span className="min-w-0 truncate font-medium">{t('sprintPlanner.contextMenu.changeStatus')}</span>
        </div>
        <Icon
          aria-hidden
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-90' : ''
          }`}
          name="chevron-right"
        />
      </Button>
      {overlay.mounted ? (
        <div
          ref={statusMenuRef}
          className={`absolute bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl py-2 px-1.5 min-w-[240px] max-w-[min(320px,calc(100vw-40px))] max-h-[400px] overflow-y-auto ${ZIndex.class('submenu')} ${OVERLAY_PANEL_ENTER}`}
          data-state={overlay.state}
          data-submenu="true"
          onAnimationEnd={overlay.onAnimationEnd}
        >
          <StatusSubmenuTransitionList
            isLoading={isLoading}
            isLoadingTransitions={isLoadingTransitions}
            pendingTransitionId={pendingTransitionId}
            statusTransitions={statusTransitions}
            task={task}
            onSelect={onSelect}
          />
        </div>
      ) : null}
    </div>
  );
}

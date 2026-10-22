'use client';

import type { Task } from '@/types';

import { useRef, useEffect, useState } from 'react';

import { Icon } from '@/components/Icon';
import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { ContextMenuRow } from '@/features/context-menu/components/ContextMenuRow';
import {
  FLOATING_MENU_GLASS_SHELL,
  MENU_PANEL_PADDING,
  MENU_ROW_ICON,
  MENU_ROW_STACK,
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
        // offset*: getBoundingClientRect меньше на время enter-анимации (scale 0.96)
        const subMenuRect = DOMRect.fromRect({
          height: statusMenuRef.current.offsetHeight,
          width: statusMenuRef.current.offsetWidth,
        });
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
      <ContextMenuRow
        ref={buttonRef}
        disabled={isLoading}
        icon={<Icon aria-hidden className={MENU_ROW_ICON} name="refresh" />}
        label={t('sprintPlanner.contextMenu.changeStatus')}
        submenuOpen={isOpen}
        value={task.originalStatusDisplay || task.originalStatus}
        onClick={onToggle}
      />
      {overlay.mounted ? (
        <div
          ref={statusMenuRef}
          className={`absolute w-max min-w-[220px] max-w-[min(280px,calc(100vw-40px))] ${FLOATING_MENU_GLASS_SHELL} ${ZIndex.class('submenu')} ${OVERLAY_PANEL_ENTER}`}
          data-state={overlay.state}
          data-submenu="true"
          onAnimationEnd={overlay.onAnimationEnd}
        >
          <div className={`max-h-[400px] overflow-y-auto ${MENU_PANEL_PADDING} ${MENU_ROW_STACK}`}>
            <StatusSubmenuTransitionList
              isLoading={isLoading}
              isLoadingTransitions={isLoadingTransitions}
              statusTransitions={statusTransitions}
              task={task}
              onSelect={onSelect}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

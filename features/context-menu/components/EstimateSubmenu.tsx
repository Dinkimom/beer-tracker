'use client';

import type { Task } from '@/types';

import { useLayoutEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

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
import { useDataSyncEstimatesStorage } from '@/hooks/useLocalStorage';
import { updateIssueWork } from '@/lib/beerTrackerApi';

interface EstimateSubmenuProps {
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  isLoading: boolean;
  isOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  suggestedEstimate: number;
  task: Task;
  onClose: () => void;
  onToggle: () => void;
  onUpdateEstimate?: (task: Task, newEstimate: number, isTestPoints: boolean) => void;
}

/** 0 — для задач без разработки/тестирования; 1–21 — стандартные оценки */
const ESTIMATE_OPTIONS = [0, ...Array.from({ length: 21 }, (_, i) => i + 1)];
/** Фиксированная ширина колонки (только min раньше давал рост flex-ряда) */
const COLUMN_WIDTH = 76;
/** Два столбца фиксированной ширины (разделитель — border-r первого столбца, внутри box-border) */
const SUBMENU_WIDTH_DOUBLE = COLUMN_WIDTH * 2;
const SUBMENU_WIDTH_SINGLE = COLUMN_WIDTH;
const SUBMENU_HEIGHT = 320;

export function EstimateSubmenu({
  task,
  suggestedEstimate,
  isOpen,
  menuRef,
  buttonRef,
  isLoading,
  onToggle,
  onClose,
  onUpdateEstimate,
}: EstimateSubmenuProps) {
  const { t } = useI18n();
  const [isUpdating, setIsUpdating] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [syncEstimates] = useDataSyncEstimatesStorage();

  const hideTestPoints = task.hideTestPointsByIntegration === true;
  const currentSP = task.storyPoints ?? 0;
  const currentTP = task.testPoints ?? 0;
  const submenuWidth = hideTestPoints ? SUBMENU_WIDTH_SINGLE : SUBMENU_WIDTH_DOUBLE;

  const updatePosition = useCallback(() => {
    if (!buttonRef.current || !menuRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = menuRect.right + 4;
    let top = buttonRect.top;

    if (left + submenuWidth > viewportWidth - 10) {
      left = menuRect.left - submenuWidth - 4;
    }
    if (top + SUBMENU_HEIGHT > viewportHeight - 10) {
      top = viewportHeight - SUBMENU_HEIGHT - 10;
    }
    if (top < 10) {
      top = 10;
    }

    setPosition({ left, top });
  }, [buttonRef, menuRef, submenuWidth]);

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    } else {
      setPosition(null);
    }
  }, [isOpen, updatePosition]);

  const handleSelect = useCallback(
    async (value: number, isTestPoints: boolean) => {
      const issueKey = isTestPoints && task.originalTaskId ? task.originalTaskId : task.id;
      const currentValue = isTestPoints ? currentTP : currentSP;
      if (value === currentValue) {
        onClose();
        return;
      }

      // Оптимистично обновляем кэш React Query. Полный reload задач не делаем:
      // search Tracker часто отдаёт ещё старую оценку и сбрасывает карточку через 1–2 секунды.
      onUpdateEstimate?.(task, value, isTestPoints);
      setIsUpdating(true);

      if (!syncEstimates) {
        onClose();
        setIsUpdating(false);
        return;
      }

      try {
        // Отправляем только изменённую ось оценки. Дальше сервер сам мапит
        // story/test в поля из trackerIntegration.testingFlow.
        const success = await updateIssueWork(
          issueKey,
          isTestPoints ? undefined : value,
          isTestPoints ? value : undefined
        );

        if (success) {
          onClose();
        } else {
          onUpdateEstimate?.(task, currentValue, isTestPoints);
        }
      } catch (err) {
        console.error('Error updating estimate:', err);
        onUpdateEstimate?.(task, currentValue, isTestPoints);
      } finally {
        setIsUpdating(false);
      }
    },
    [
      task,
      currentSP,
      currentTP,
      onClose,
      onUpdateEstimate,
      syncEstimates,
    ]
  );

  const handleScroll = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtTop = scrollTop === 0;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1;
    if ((e.deltaY < 0 && isAtTop) || (e.deltaY > 0 && isAtBottom)) {
      e.preventDefault();
    }
    e.stopPropagation();
  }, []);

  const renderColumn = (
    label: string,
    isTestPoints: boolean,
    currentValue: number,
    ariaLabel: string
  ) => {
    return (
      <div
        key={label}
        aria-label={ariaLabel}
        className="flex shrink-0 flex-col border-r border-gray-200 last:border-r-0 dark:border-gray-600"
        role="group"
        style={{ width: COLUMN_WIDTH }}
      >
        <div className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
          {label}
        </div>
        <div
          className="overflow-y-auto overscroll-contain flex-1 py-1 scrollbar-thin-custom"
          style={{ maxHeight: SUBMENU_HEIGHT - 32 }}
          onWheel={handleScroll}
        >
          {ESTIMATE_OPTIONS.map((value) => {
            const isCurrent = value === currentValue;
            const isSuggested = value === suggestedEstimate;

            return (
              <Button
                key={value}
                aria-pressed={isCurrent}
                className={`flex h-auto min-h-0 w-full items-center justify-between gap-1 rounded-none px-2 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${CONTEXT_MENU_GHOST_BUTTON_RESET} ${
                  isCurrent
                    ? 'bg-blue-50 font-medium text-blue-700 hover:!bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:!bg-blue-900/40'
                    : 'text-gray-700 hover:!bg-gray-50 dark:text-gray-300 dark:hover:!bg-gray-700'
                }`}
                disabled={isLoading || isUpdating}
                title={
                  isSuggested && !isCurrent
                    ? t('sprintPlanner.contextMenu.estimateRecommendedByPhase')
                    : undefined
                }
                type="button"
                variant="ghost"
                onClick={() => handleSelect(value, isTestPoints)}
              >
                <span>{value}</span>
                {isSuggested && !isCurrent && (
                  <span
                    className="truncate rounded bg-blue-100 px-1 text-[10px] text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    title={t('sprintPlanner.contextMenu.estimateRecommended')}
                  >
                    {t('sprintPlanner.contextMenu.estimateRecommendedShort')}
                  </span>
                )}
                {isCurrent && (
                  <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" name="check" />
                )}
              </Button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSubmenu = () => {
    if (!isOpen || !position) return null;

    return createPortal(
      <div
        className="relative"
        data-submenu="true"
        style={{
          left: position.left,
          position: 'fixed',
          top: position.top,
          zIndex: ZIndex.submenu,
        }}
      >
        <div
          className={`flex shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white py-0 shadow-2xl dark:border-gray-700 dark:bg-gray-800 ${OVERLAY_PANEL_ENTER}`}
          style={{
            maxHeight: SUBMENU_HEIGHT,
            width: submenuWidth,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {renderColumn('SP', false, currentSP, 'Story Points')}
          {!hideTestPoints ? renderColumn('TP', true, currentTP, 'Test Points') : null}
        </div>
        {isUpdating && (
          <div
            className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center rounded-lg"
            style={{ zIndex: 1 }}
          >
            <Icon className="animate-spin h-6 w-6 text-blue-600 dark:text-blue-400" name="spinner" />
          </div>
        )}
      </div>,
      document.body
    );
  };

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
          <Icon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" name="edit" />
          <span className="min-w-0 truncate font-medium">{t('sprintPlanner.contextMenu.changeEstimate')}</span>
        </div>
        <Icon
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-90' : ''
          }`}
          name="chevron-right"
        />
      </Button>

      {renderSubmenu()}
    </div>
  );
}

'use client';

import type { Task } from '@/types';

import { useLayoutEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OVERLAY_PANEL_ENTER } from '@/components/overlayAnimationClasses';
import { TextTooltip } from '@/components/TextTooltip';
import { ZIndex } from '@/constants';
import { useI18n } from '@/contexts/LanguageContext';
import { ContextMenuRow } from '@/features/context-menu/components/ContextMenuRow';
import {
  CONTEXT_MENU_DIVIDER_COLOR,
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
  FLOATING_MENU_GLASS_SHELL,
  FLOATING_TOOLBAR_ITEM_ON,
  MENU_ROW_ICON,
  MENU_SECTION_LABEL,
  MENU_SUBMENU_ALIGN_INSET_PX,
} from '@/features/context-menu/contextMenuClasses';
import { useDataSyncEstimatesStorage } from '@/hooks/useLocalStorage';
import { updateIssueWork } from '@/lib/beerTrackerApi';
import { formatPointsForDisplay } from '@/lib/pointsUtils';

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
/** Поле `p-1` с двух сторон + кромка панели. */
const SUBMENU_CHROME_PX = MENU_SUBMENU_ALIGN_INSET_PX * 2;
const SUBMENU_WIDTH_DOUBLE = COLUMN_WIDTH * 2 + SUBMENU_CHROME_PX;
const SUBMENU_WIDTH_SINGLE = COLUMN_WIDTH + SUBMENU_CHROME_PX;
const SUBMENU_HEIGHT = 320;
const SUBMENU_GAP = 4;

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
  const estimateValue = hideTestPoints
    ? `${formatPointsForDisplay(currentSP)} sp`
    : `${formatPointsForDisplay(currentSP)} sp · ${formatPointsForDisplay(currentTP)} tp`;

  const updatePosition = useCallback(() => {
    if (!buttonRef.current || !menuRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = menuRect.right + SUBMENU_GAP;
    let top = buttonRect.top - MENU_SUBMENU_ALIGN_INSET_PX;

    if (left + submenuWidth > viewportWidth - 10) {
      left = menuRect.left - submenuWidth - SUBMENU_GAP;
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
        className={`flex shrink-0 flex-col px-0.5 [&+&]:border-l ${CONTEXT_MENU_DIVIDER_COLOR}`}
        role="group"
        style={{ width: COLUMN_WIDTH }}
      >
        <div className={`${MENU_SECTION_LABEL} text-center`}>{label}</div>
        <div
          className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin-custom"
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
                className={`!flex h-7 w-full !items-center !justify-between gap-1 !rounded-md border-0 bg-transparent !px-2 !py-0 text-sm tabular-nums shadow-none active:!scale-100 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isCurrent
                    ? `!font-medium ${FLOATING_TOOLBAR_ITEM_ON}`
                    : `!font-normal text-gray-800 dark:text-gray-100 ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER}`
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
                  <TextTooltip content={t('sprintPlanner.contextMenu.estimateRecommended')}>
                    <span className="truncate rounded bg-blue-500/10 px-1 text-[10px] font-medium leading-4 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300">
                      {t('sprintPlanner.contextMenu.estimateRecommendedShort')}
                    </span>
                  </TextTooltip>
                )}
                {isCurrent && (
                  <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" name="check" />
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
          className={`relative flex shrink-0 overflow-hidden p-1 ${FLOATING_MENU_GLASS_SHELL} ${OVERLAY_PANEL_ENTER}`}
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
            className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/60 dark:bg-gray-900/50"
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
      <ContextMenuRow
        ref={buttonRef}
        disabled={isLoading}
        icon={<Icon aria-hidden className={MENU_ROW_ICON} name="edit" />}
        label={t('sprintPlanner.contextMenu.changeEstimate')}
        submenuOpen={isOpen}
        value={estimateValue}
        onClick={onToggle}
      />

      {renderSubmenu()}
    </div>
  );
}

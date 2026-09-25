'use client';

import type { Task, TaskParent } from '@/types';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { EstimateSubmenu } from '@/features/context-menu/components/EstimateSubmenu';
import { ParentSubmenu } from '@/features/context-menu/components/ParentSubmenu';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  CONTEXT_MENU_ITEM_ROW,
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
  CONTEXT_MENU_SEPARATOR,
} from '@/features/context-menu/contextMenuClasses';

interface ContextMenuPlanItemsProps {
  boardId: number | null;
  estimateButtonRef: React.RefObject<HTMLButtonElement | null>;
  hasItemsAbove: boolean;
  isEstimateMenuOpen: boolean;
  isLoading: boolean;
  isParentMenuOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  parentOptions: TaskParent[];
  showEstimate: boolean;
  showParent: boolean;
  showSplitPhase: boolean;
  suggestedEstimate: number;
  task: Task;
  onClose: () => void;
  onEstimateToggle: () => void;
  onParentSelect: (parent: TaskParent | null) => void;
  onParentToggle: () => void;
  onSplitPhaseIntoSegments?: (task: Task) => void;
  onUpdateEstimate?: (task: Task, newEstimate: number, isTestPoints: boolean) => void;
}

export function ContextMenuPlanItems({
  boardId,
  estimateButtonRef,
  hasItemsAbove,
  isEstimateMenuOpen,
  isLoading,
  isParentMenuOpen,
  menuRef,
  parentOptions,
  showEstimate,
  showParent,
  showSplitPhase,
  suggestedEstimate,
  task,
  onClose,
  onEstimateToggle,
  onParentSelect,
  onParentToggle,
  onSplitPhaseIntoSegments,
  onUpdateEstimate,
}: ContextMenuPlanItemsProps) {
  const { t } = useI18n();

  if (!showEstimate && !showParent && !showSplitPhase) {
    return null;
  }

  return (
    <>
      {showEstimate && (
        <>
          {hasItemsAbove ? <div className={CONTEXT_MENU_SEPARATOR} role="separator" /> : null}
          <EstimateSubmenu
            buttonRef={estimateButtonRef}
            isLoading={isLoading}
            isOpen={isEstimateMenuOpen}
            menuRef={menuRef}
            suggestedEstimate={suggestedEstimate}
            task={task}
            onClose={onClose}
            onToggle={onEstimateToggle}
            onUpdateEstimate={onUpdateEstimate}
          />
        </>
      )}

      {showParent && (
        <>
          {hasItemsAbove && !showEstimate ? (
            <div className={CONTEXT_MENU_SEPARATOR} role="separator" />
          ) : null}
          <ParentSubmenu
            boardId={boardId}
            isLoading={isLoading}
            isOpen={isParentMenuOpen}
            parentOptions={parentOptions}
            task={task}
            onSelect={onParentSelect}
            onToggle={onParentToggle}
          />
        </>
      )}

      {showSplitPhase && (
        <>
          {hasItemsAbove && !showEstimate && !showParent ? (
            <div className={CONTEXT_MENU_SEPARATOR} role="separator" />
          ) : null}
          <Button
            className={`${CONTEXT_MENU_ITEM_ROW} ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
            disabled={isLoading}
            type="button"
            variant="ghost"
            onClick={() => {
              onSplitPhaseIntoSegments?.(task);
              onClose();
            }}
          >
            <Icon
              className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400"
              name="phase-segments"
            />
            <span>{t('sprintPlanner.contextMenu.editSegments')}</span>
          </Button>
        </>
      )}
    </>
  );
}

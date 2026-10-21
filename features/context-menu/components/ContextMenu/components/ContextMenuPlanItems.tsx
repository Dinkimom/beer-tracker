'use client';

import type { Task, TaskParent } from '@/types';

import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { ContextMenuGroup } from '@/features/context-menu/components/ContextMenuGroup';
import { ContextMenuRow } from '@/features/context-menu/components/ContextMenuRow';
import { EstimateSubmenu } from '@/features/context-menu/components/EstimateSubmenu';
import { ParentSubmenu } from '@/features/context-menu/components/ParentSubmenu';
import { MENU_ROW_ICON } from '@/features/context-menu/contextMenuClasses';

interface ContextMenuPlanItemsProps {
  boardId: number | null;
  estimateButtonRef: React.RefObject<HTMLButtonElement | null>;
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

  return (
    <ContextMenuGroup>
      {showEstimate ? (
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
      ) : null}
      {showParent ? (
        <ParentSubmenu
          boardId={boardId}
          isLoading={isLoading}
          isOpen={isParentMenuOpen}
          parentOptions={parentOptions}
          task={task}
          onSelect={onParentSelect}
          onToggle={onParentToggle}
        />
      ) : null}
      {showSplitPhase ? (
        <ContextMenuRow
          disabled={isLoading}
          icon={<Icon className={MENU_ROW_ICON} name="scissors" />}
          label={t('sprintPlanner.contextMenu.editSegments')}
          onClick={() => {
            onSplitPhaseIntoSegments?.(task);
            onClose();
          }}
        />
      ) : null}
    </ContextMenuGroup>
  );
}

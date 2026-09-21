/**
 * Компонент действий для ContextMenu
 */

import type { ContextMenuAssigneeOptions } from '@/features/context-menu/components/AssigneeSubmenu';
import type { Task } from '@/types';

import { Button } from '@/components/Button';
import { CardLinkIcon } from '@/components/CardLinkIcon';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { AssigneeSubmenu } from '@/features/context-menu/components/AssigneeSubmenu';
import {
  CONTEXT_MENU_GHOST_BUTTON_RESET,
  CONTEXT_MENU_ITEM_ROW,
  CONTEXT_MENU_ITEM_ROW_DESTRUCTIVE,
  CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER,
  CONTEXT_MENU_SEPARATOR,
} from '@/features/context-menu/contextMenuClasses';

interface ContextMenuActionsProps {
  assigneeButtonRef: React.RefObject<HTMLButtonElement | null>;
  assigneeOptions?: ContextMenuAssigneeOptions | null;
  currentSprintId: number | null;
  hasPosition: boolean;
  /** Между шапкой меню и действиями уже есть строки подменю — нужен разделитель */
  hasSubmenusAboveActions: boolean;
  hideRemoveFromPlan?: boolean;
  isAssigneeMenuOpen: boolean;
  isBacklogTask: boolean;
  isKanbanView?: boolean;
  isLoading: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
  selectedAssigneeId: string;
  task: Task;
  onAssigneeSelect?: (assigneeId: string) => void;
  onAssigneeToggle: () => void;
  onClose: () => void;
  onRemoveFromPlan?: () => void;
  onRemoveFromSprint: () => void;
  onStartLinking?: (task: Task) => void;
}

export function ContextMenuActions({
  assigneeButtonRef,
  assigneeOptions = null,
  currentSprintId,
  hasPosition,
  hasSubmenusAboveActions,
  hideRemoveFromPlan = false,
  isAssigneeMenuOpen,
  isLoading,
  isBacklogTask,
  isKanbanView = false,
  menuRef,
  selectedAssigneeId,
  task,
  onAssigneeSelect,
  onAssigneeToggle,
  onClose,
  onRemoveFromPlan,
  onRemoveFromSprint,
  onStartLinking,
}: ContextMenuActionsProps) {
  const { t } = useI18n();

  const showChangeAssignee = !isBacklogTask && Boolean(assigneeOptions) && Boolean(onAssigneeSelect);

  const showStartLinking =
    hasPosition && !isBacklogTask && !isKanbanView && Boolean(onStartLinking);

  const showRemoveFromPlan =
    !hideRemoveFromPlan &&
    !isBacklogTask &&
    !isKanbanView &&
    currentSprintId !== null &&
    onRemoveFromPlan;

  const showRemoveFromSprint = !isBacklogTask && currentSprintId !== null;

  if (!showChangeAssignee && !showStartLinking && !showRemoveFromPlan && !showRemoveFromSprint) {
    return null;
  }

  const hasRegularActions = showChangeAssignee || showStartLinking;
  const hasDestructiveActions = showRemoveFromPlan || showRemoveFromSprint;
  const showSeparatorBeforeRegular = hasRegularActions && hasSubmenusAboveActions;
  const showSeparatorBeforeDestructive =
    hasDestructiveActions && (hasRegularActions || hasSubmenusAboveActions);

  return (
    <>
      {hasRegularActions && (
        <>
          {showSeparatorBeforeRegular && <div className={CONTEXT_MENU_SEPARATOR} role="separator" />}
          {showChangeAssignee && assigneeOptions && onAssigneeSelect ? (
            <AssigneeSubmenu
              buttonRef={assigneeButtonRef}
              isLoading={isLoading}
              isOpen={isAssigneeMenuOpen}
              menuRef={menuRef}
              options={assigneeOptions}
              selectedAssigneeId={selectedAssigneeId}
              task={task}
              onSelect={(assigneeId) => {
                onAssigneeSelect(assigneeId);
                onClose();
              }}
              onToggle={onAssigneeToggle}
            />
          ) : null}

          {showStartLinking && (
            <Button
              className={`${CONTEXT_MENU_ITEM_ROW} ${CONTEXT_MENU_ITEM_ROW_NEUTRAL_HOVER} ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
              disabled={isLoading}
              type="button"
              variant="ghost"
              onClick={() => {
                onStartLinking?.(task);
                onClose();
              }}
            >
              <CardLinkIcon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
              <span>{t('sprintPlanner.contextMenu.linkCards')}</span>
            </Button>
          )}
        </>
      )}

      {hasDestructiveActions && (
        <>
          {showSeparatorBeforeDestructive && (
            <div className={CONTEXT_MENU_SEPARATOR} role="separator" />
          )}
          {showRemoveFromPlan && (
            <Button
              className={`${CONTEXT_MENU_ITEM_ROW_DESTRUCTIVE} ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
              disabled={isLoading}
              type="button"
              variant="ghost"
              onClick={() => {
                onRemoveFromPlan?.();
              }}
            >
              <Icon className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" name="circle-x" />
              <span>{t('sprintPlanner.contextMenu.removeFromPlan')}</span>
            </Button>
          )}

          {showRemoveFromSprint && (
            <Button
              className={`${CONTEXT_MENU_ITEM_ROW_DESTRUCTIVE} ${CONTEXT_MENU_GHOST_BUTTON_RESET}`}
              disabled={isLoading}
              type="button"
              variant="ghost"
              onClick={onRemoveFromSprint}
            >
              <Icon className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" name="trash" />
              <span>{t('sprintPlanner.contextMenu.removeFromSprint')}</span>
            </Button>
          )}
        </>
      )}
    </>
  );
}

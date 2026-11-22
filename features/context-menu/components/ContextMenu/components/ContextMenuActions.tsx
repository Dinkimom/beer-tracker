import type { ContextMenuAssigneeOptions } from '@/features/context-menu/components/AssigneeSubmenu';
/**
 * Компонент действий для ContextMenu
 */
import type { Task } from '@/types';

import { observer } from 'mobx-react-lite';

import { CardLinkIcon } from '@/components/CardLinkIcon';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/contexts/LanguageContext';
import { AssigneeSubmenu } from '@/features/context-menu/components/AssigneeSubmenu';
import { ContextMenuGroup } from '@/features/context-menu/components/ContextMenuGroup';
import { ContextMenuRow } from '@/features/context-menu/components/ContextMenuRow';
import { MENU_ROW_ICON } from '@/features/context-menu/contextMenuClasses';
import { useRootStore } from '@/lib/layers';

interface ContextMenuActionsProps {
  assigneeOptions?: ContextMenuAssigneeOptions | null;
  currentSprintId: number | null;
  hasPosition: boolean;
  hideRemoveFromPlan?: boolean;
  isAssigneeMenuOpen: boolean;
  isBacklogTask: boolean;
  isKanbanView?: boolean;
  isLoading: boolean;
  /** Пункт «Связать с другой карточкой» разрешён экраном (режим связи — у UI-стора). */
  linkingEnabled?: boolean;
  selectedAssigneeId: string;
  task: Task;
  onAssigneeSelect?: (assigneeId: string) => void;
  onAssigneeToggle: () => void;
  onClose: () => void;
  onRemoveFromPlan?: () => void;
  onRemoveFromSprint: () => void;
}

export const ContextMenuActions = observer(function ContextMenuActions({
  assigneeOptions = null,
  currentSprintId,
  hasPosition,
  hideRemoveFromPlan = false,
  isAssigneeMenuOpen,
  isLoading,
  isBacklogTask,
  isKanbanView = false,
  selectedAssigneeId,
  task,
  onAssigneeSelect,
  onAssigneeToggle,
  onClose,
  onRemoveFromPlan,
  onRemoveFromSprint,
  linkingEnabled = false,
}: ContextMenuActionsProps) {
  const { t } = useI18n();
  const { tools } = useRootStore().sprintPlannerUi;

  const showRemoveFromPlan =
    !hideRemoveFromPlan && !isBacklogTask && !isKanbanView && currentSprintId !== null;
  const canStartLinking = linkingEnabled && hasPosition && !isBacklogTask && !isKanbanView;

  return (
    <>
      <ContextMenuGroup>
        {!isBacklogTask && assigneeOptions && onAssigneeSelect ? (
          <AssigneeSubmenu
            isLoading={isLoading}
            isOpen={isAssigneeMenuOpen}
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
        {canStartLinking ? (
          <ContextMenuRow
            disabled={isLoading}
            icon={<CardLinkIcon className={MENU_ROW_ICON} />}
            label={t('sprintPlanner.contextMenu.linkCards')}
            onClick={() => {
              tools.setLinkingFromTaskId(task.id);
              onClose();
            }}
          />
        ) : null}
      </ContextMenuGroup>

      <ContextMenuGroup>
        {showRemoveFromPlan && onRemoveFromPlan ? (
          <ContextMenuRow
            destructive
            disabled={isLoading}
            icon={<Icon className="h-4 w-4 shrink-0" name="circle-x" />}
            label={t('sprintPlanner.contextMenu.removeFromPlan')}
            onClick={() => onRemoveFromPlan()}
          />
        ) : null}
        {!isBacklogTask && currentSprintId !== null ? (
          <ContextMenuRow
            destructive
            disabled={isLoading}
            icon={<Icon className="h-4 w-4 shrink-0" name="trash" />}
            label={t('sprintPlanner.contextMenu.removeFromSprint')}
            onClick={onRemoveFromSprint}
          />
        ) : null}
      </ContextMenuGroup>
    </>
  );
});

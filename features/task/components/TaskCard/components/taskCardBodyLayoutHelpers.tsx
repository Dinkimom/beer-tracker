import type { SwimlaneCardFieldsVisibility } from '@/hooks/useLocalStorage';
import type { Task, TaskCardVariant } from '@/types';

import { Avatar, type AvatarInitialsVariant } from '@/components/Avatar';
import { isTaskGroupSentinelKey } from '@/features/task/constants/taskGroupKeys';
import { FEATURE_LANE_DRAFT_ROW_PREFIX, isFeatureLaneDraftRowId } from '@/lib/sprints/featureLanesDocument';
import { isTeamSwimlaneAssigneeId } from '@/lib/swimlane/teamSwimlaneAssignee';

import { isSwimlaneSingleTimeslotWidth } from '../taskCardLayoutHelpers';

interface TaskCardSidebarAssigneeRowProps {
  assigneeAvatarUrl?: string | null;
  assigneeAvatarVariant: AvatarInitialsVariant;
  assigneeDisplayName?: string;
  assigneeInitials: string;
  assigneeLabel: string;
  assigneeMargin: string;
  assigneeTextSize: string;
  sidebarAssigneeContent: React.ReactNode;
}

export function TaskCardSidebarAssigneeRow({
  assigneeAvatarUrl,
  assigneeAvatarVariant,
  assigneeDisplayName,
  assigneeInitials,
  assigneeLabel,
  assigneeMargin,
  assigneeTextSize,
  sidebarAssigneeContent,
}: TaskCardSidebarAssigneeRowProps) {
  return (
    <div
      className={`${assigneeTextSize} ${assigneeMargin} text-gray-700 dark:text-gray-200 truncate flex-shrink-0 font-medium flex items-center gap-2`}
      style={{ lineHeight: '1.3' }}
    >
      {assigneeDisplayName && (
        <Avatar
          avatarUrl={assigneeAvatarUrl}
          className="shrink-0"
          initials={assigneeInitials}
          initialsVariant={assigneeAvatarVariant}
          size="xs"
          title={assigneeLabel}
        />
      )}
      {sidebarAssigneeContent}
    </div>
  );
}

export function resolveTaskCardBodyStackClass(variant: TaskCardVariant, isPhotoCard = false): string {
  if (variant === 'swimlane') {
    return isPhotoCard ? 'flex h-full min-h-0 flex-1 flex-col gap-0' : 'flex h-full min-h-0 flex-1 flex-col gap-1';
  }
  return 'flex min-h-0 flex-1 flex-col';
}

export function resolveTaskCardContentDisplayDuration(
  variant: TaskCardVariant,
  displayDuration: number | undefined
): number {
  if (variant === 'swimlane' && displayDuration !== undefined) return displayDuration;
  return 5;
}

export function shouldShowTaskCardParentRow(input: {
  displayDuration?: number;
  hideParent?: boolean;
  swimlaneCardFields?: SwimlaneCardFieldsVisibility;
  task: Task;
  variant: TaskCardVariant;
}): boolean {
  if (input.hideParent) {
    return false;
  }
  if (input.variant !== 'swimlane' || isSwimlaneSingleTimeslotWidth(input.displayDuration)) {
    return false;
  }
  return Boolean(input.swimlaneCardFields?.showParent && input.task.parent);
}

/** Id строки фичи / «Общее» / «Без родителя» — не имя человека. */
export function isFeatureLaneSyntheticRowId(rowId: string | undefined): boolean {
  if (!rowId) {
    return false;
  }
  const normalized = rowId.trim();
  if (!normalized) {
    return false;
  }
  return (
    isTeamSwimlaneAssigneeId(normalized) ||
    isTaskGroupSentinelKey(normalized) ||
    isFeatureLaneDraftRowId(normalized) ||
    normalized.toLowerCase().startsWith(FEATURE_LANE_DRAFT_ROW_PREFIX)
  );
}

export function shouldShowTaskCardSwimlaneAssigneeAvatar(input: {
  hasAssignee: boolean;
  showAssigneeAvatar: boolean;
  task: Pick<Task, 'assignee' | 'isLocalTask' | 'localDraftKind'>;
  variant: TaskCardVariant;
}): boolean {
  if (!input.showAssigneeAvatar || input.variant !== 'swimlane' || !input.hasAssignee) {
    return false;
  }
  if (input.task.isLocalTask === true) {
    return false;
  }
  const kind = input.task.localDraftKind;
  if (kind === 'diagram' || kind === 'existing' || kind === 'image') {
    return false;
  }
  if (isFeatureLaneSyntheticRowId(input.task.assignee)) {
    return false;
  }
  return true;
}

type TaskCardSwimlaneAssigneeAvatarPlacement = 'footer' | 'none';

/**
 * На одном таймслоте подвал съедает высоту карточки.
 * Исполнитель — имя и фамилия внизу, заголовок занимает всю ширину.
 */
export function resolveTaskCardSwimlaneAssigneeAvatarPlacement(input: {
  displayDuration?: number;
  hasAssignee: boolean;
  showAssigneeAvatar: boolean;
  task: Pick<Task, 'assignee' | 'isLocalTask' | 'localDraftKind'>;
  variant: TaskCardVariant;
}): TaskCardSwimlaneAssigneeAvatarPlacement {
  if (!shouldShowTaskCardSwimlaneAssigneeAvatar(input) || isSwimlaneSingleTimeslotWidth(input.displayDuration)) {
    return 'none';
  }
  return 'footer';
}

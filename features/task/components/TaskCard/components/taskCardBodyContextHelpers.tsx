'use client';

import type { useI18n } from '@/contexts/LanguageContext';
import type { Developer, Task, TaskCardVariant, TaskParent } from '@/types';

import {
  getAvatarVariantForDeveloper,
  getAvatarVariantForTeam,
} from '@/components/Avatar';
import { isEffectivelyQaTask } from '@/features/task/utils/taskUtils';
import { getInitials } from '@/utils/displayUtils';

import { isFeatureLaneSyntheticRowId } from './taskCardBodyLayoutHelpers';

type Translate = ReturnType<typeof useI18n>['t'];

function resolveSwimlaneWidthModes(
  variant: TaskCardVariant,
  displayDuration: number | undefined
): { isNarrow: boolean; isSwimlane: boolean; isVeryNarrow: boolean } {
  const isSwimlane = variant === 'swimlane';
  const isVeryNarrow = isSwimlane && displayDuration !== undefined && displayDuration < 3;
  const isNarrow = isSwimlane && displayDuration !== undefined && displayDuration < 4;
  return { isNarrow, isSwimlane, isVeryNarrow };
}

function resolveSidebarAssigneeContent(
  assigneeDisplayName: string | undefined,
  assigneeLabel: string,
  task: Task
): React.ReactNode {
  if (assigneeDisplayName) {
    return assigneeDisplayName;
  }
  return (
    <span className={task.team && task.team !== 'QA' ? 'capitalize' : undefined}>
      {assigneeLabel}
    </span>
  );
}

function isParentEntityLabel(parent: TaskParent | null | undefined, label: string): boolean {
  return parent != null && (parent.id === label || parent.key === label || parent.display === label);
}

function resolveDeveloperName(
  assigneeId: string | undefined,
  developers: readonly Developer[]
): string | undefined {
  if (!assigneeId || isFeatureLaneSyntheticRowId(assigneeId)) {
    return undefined;
  }
  return developers.find((dev) => dev.id === assigneeId)?.name;
}

function resolveUsableAssigneeLabel(
  label: string | undefined,
  task: Pick<Task, 'epic' | 'parent'>
): string | undefined {
  const trimmed = label?.trim();
  if (!trimmed || isFeatureLaneSyntheticRowId(trimmed)) {
    return undefined;
  }
  if (isParentEntityLabel(task.parent, trimmed) || isParentEntityLabel(task.epic, trimmed)) {
    return undefined;
  }
  return trimmed;
}

function resolveAssigneeDisplayName({
  assigneeName,
  developers,
  task,
}: {
  assigneeName?: string;
  developers: Developer[];
  task: Task;
}): string | undefined {
  return (
    resolveDeveloperName(task.assignee, developers) ??
    resolveUsableAssigneeLabel(task.assigneeName, task) ??
    task.stickyNoteAuthorName?.trim() ??
    resolveDeveloperName(assigneeName, developers) ??
    resolveUsableAssigneeLabel(assigneeName, task)
  );
}

function resolveAssigneeLabel(
  assigneeDisplayName: string | undefined,
  task: Task,
  t: Translate
): string {
  if (assigneeDisplayName) return assigneeDisplayName;
  if (task.team && task.team !== 'QA') return task.team;
  return t('task.card.noAssignee');
}

function resolveAssigneeTextSize({
  isNarrow,
  isVeryNarrow,
  variant,
}: {
  isNarrow: boolean;
  isVeryNarrow: boolean;
  variant: TaskCardVariant;
}): string {
  if (variant === 'sidebar') return 'text-[12px]';
  if (isVeryNarrow) return 'text-[8px]';
  if (isNarrow) return 'text-[9px]';
  return 'text-[10px]';
}

export function resolveTaskCardBodyContext(input: {
  assigneeName?: string;
  developers: Developer[];
  displayDuration: number | undefined;
  explicitIsQATask?: boolean;
  t: Translate;
  task: Task;
  variant: TaskCardVariant;
}) {
  const isQATask = input.explicitIsQATask === true || isEffectivelyQaTask(input.task);
  const { isNarrow, isSwimlane, isVeryNarrow } = resolveSwimlaneWidthModes(
    input.variant,
    input.displayDuration
  );
  const assigneeDisplayName = resolveAssigneeDisplayName({
    assigneeName: input.assigneeName,
    developers: input.developers,
    task: input.task,
  });
  const assigneeDeveloper = input.task.assignee
    ? input.developers.find((dev) => dev.id === input.task.assignee)
    : undefined;
  const assigneeLabel = resolveAssigneeLabel(assigneeDisplayName, input.task, input.t);
  const assigneeInitials = getInitials(assigneeLabel);
  const assigneeAvatarVariant = assigneeDeveloper
    ? getAvatarVariantForDeveloper(assigneeDeveloper)
    : getAvatarVariantForTeam(input.task.team);

  return {
    assigneeAvatarVariant,
    assigneeDeveloper,
    assigneeDisplayName,
    assigneeInitials,
    assigneeLabel,
    assigneeMargin: 'mt-2.5 mb-2.5',
    assigneeTextSize: resolveAssigneeTextSize({ isNarrow, isVeryNarrow, variant: input.variant }),
    hideTestPoints: input.task.hideTestPointsByIntegration === true,
    isNarrow,
    isQATask,
    isSwimlane,
    isVeryNarrow,
    sidebarAssigneeContent: resolveSidebarAssigneeContent(assigneeDisplayName, assigneeLabel, input.task),
  };
}

'use client';

import type { TaskCardSlotItemContext } from './taskCardSlotItemContext';
import type { TaskCardKeyLinkProps } from './taskCardSlotItemContext';
import type { ResolvedTaskCardSlotItem } from '@/lib/taskCard/taskCardSlots';
import type { Task } from '@/types';

import { IssueTypeIcon } from '@/components/IssueTypeIcon';
import { PriorityIcon } from '@/components/PriorityIcon';
import { StatusTag } from '@/components/StatusTag';
import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { getIncidentSeverityTagClasses } from '@/features/task/utils/incidentSeverityBadgeClasses';
import { taskStatusLabel } from '@/features/task/utils/taskUtils';
import { applyTaskCardValueLabels } from '@/lib/taskCard/taskCardValueLabels';
import { getDisplayShortName } from '@/utils/displayUtils';
import { getStatusColors, resolvePaletteStatusKey } from '@/utils/statusColors';

import { TaskCardFeatureLaneAssigneeChip } from '../components/TaskCardFeatureLaneAssigneeChip';

interface TaskCardSlotItemProps {
  context: TaskCardSlotItemContext;
  item: ResolvedTaskCardSlotItem;
  keyLinkProps: TaskCardKeyLinkProps;
  task: Task;
}

const META_TEXT = 'text-[10px] font-medium leading-none text-gray-600 dark:text-gray-300';
const CHIP = 'inline-flex items-center rounded border px-1 py-0.5 text-[10px] font-medium leading-none';

export function TaskCardSlotItem({ context, item, keyLinkProps, task }: TaskCardSlotItemProps) {
  const { t } = useI18n();
  switch (item.field) {
    case 'assignee':
      return renderAssignee(item, context);
    case 'estimate':
      return renderEstimate(item, context.estimateLabel);
    case 'key':
      return renderKey(item, context.displayId, keyLinkProps);
    case 'parent':
      return renderParent(context.parentLabel);
    case 'priority':
      return renderPriority(item, task.priority);
    case 'severity':
      return renderSeverity(item, task.incidentSeverity, t('task.card.severityValue', { value: task.incidentSeverity ?? '' }));
    case 'status':
      return renderStatus(item, task);
    case 'type':
      return renderType(item, task.type);
    case 'custom':
      return renderCustomField(item, task);
    default:
      return null;
  }
}

function renderCustomField(item: ResolvedTaskCardSlotItem, task: Task) {
  const value = item.customFieldId ? task.customFieldValues?.[item.customFieldId] : undefined;
  if (!value) {
    return null;
  }
  const shown = applyTaskCardValueLabels(value, item.valueLabels);
  const text = customFieldCaption(item.label, shown);
  const title = customFieldCaption(item.label, value);
  if (item.presentation === 'tag') {
    return (
      <span
        className={`${CHIP} max-w-full truncate border-gray-300 text-gray-700 dark:border-gray-500 dark:text-gray-200`}
        data-task-card-field={item.customFieldId}
        title={title}
      >
        {text}
      </span>
    );
  }
  return (
    <span className={`${META_TEXT} min-w-0 max-w-full truncate`} data-task-card-field={item.customFieldId} title={title}>
      {text}
    </span>
  );
}

function customFieldCaption(label: string | undefined, value: string): string {
  const name = label?.trim();
  if (!name) {
    return value;
  }
  return `${name}: ${value}`;
}

function renderParent(label: string | undefined) {
  if (!label) {
    return null;
  }
  return (
    <span className="min-w-0 truncate text-[10px] leading-tight text-gray-700 dark:text-gray-200" data-task-card-field="parent">
      {label}
    </span>
  );
}

function renderKey(
  item: ResolvedTaskCardSlotItem,
  displayId: string | undefined,
  keyLinkProps: TaskCardKeyLinkProps
) {
  if (!displayId) {
    return null;
  }
  if (item.presentation === 'text') {
    return (
      <span className={`${META_TEXT} font-bold`} data-task-card-field="key">
        {displayId}
      </span>
    );
  }
  return (
    <TextTooltip content={keyLinkProps.title}>
      <a
        className="cursor-pointer break-all text-[10px] font-bold leading-tight text-blue-600 hover:underline dark:text-blue-400"
        data-task-card-field="key"
        {...keyLinkProps}
        title={undefined}
      >
        {displayId}
      </a>
    </TextTooltip>
  );
}

function renderPriority(item: ResolvedTaskCardSlotItem, priority: string | undefined) {
  if (!priority) {
    return null;
  }
  if (item.presentation === 'icon') {
    return <PriorityIcon className="h-3 w-3 shrink-0" priority={priority} />;
  }
  if (item.presentation === 'tag') {
    return (
      <span className={`${CHIP} border-gray-300 text-gray-700 dark:border-gray-500 dark:text-gray-200`} data-task-card-field="priority">
        {priority}
      </span>
    );
  }
  return (
    <span className={META_TEXT} data-task-card-field="priority">
      {priority}
    </span>
  );
}

function renderType(item: ResolvedTaskCardSlotItem, type: string | undefined) {
  if (!type) {
    return null;
  }
  if (item.presentation === 'icon') {
    return <IssueTypeIcon className="h-3 w-3 shrink-0" type={type} />;
  }
  if (item.presentation === 'tag') {
    return (
      <span className={`${CHIP} border-gray-300 text-gray-700 dark:border-gray-500 dark:text-gray-200`} data-task-card-field="type">
        {type}
      </span>
    );
  }
  return (
    <span className={`${META_TEXT} capitalize`} data-task-card-field="type">
      {type}
    </span>
  );
}

function renderStatus(item: ResolvedTaskCardSlotItem, task: Task) {
  const label = taskStatusLabel(task);
  if (!label) {
    return null;
  }
  if (item.presentation === 'tag') {
    return (
      <StatusTag
        className="px-1 py-0.5 text-[10px]"
        label={label}
        status={task.originalStatus}
        statusColorKey={task.statusColorKey}
      />
    );
  }
  if (item.presentation === 'dot') {
    const paletteKey = resolvePaletteStatusKey(task.originalStatus, task.statusColorKey);
    const colors = getStatusColors(paletteKey);
    return (
      <TextTooltip content={label}>
        <span
          aria-label={label}
          className={`inline-block h-2 w-2 shrink-0 rounded-full ${colors.tagBg} ${colors.tagBgDark ?? ''}`}
          data-task-card-field="status"
        />
      </TextTooltip>
    );
  }
  return (
    <span className={META_TEXT} data-task-card-field="status">
      {label}
    </span>
  );
}

function renderSeverity(item: ResolvedTaskCardSlotItem, severity: string | undefined, tooltip: string) {
  if (!severity) {
    return null;
  }
  if (item.presentation === 'text') {
    return (
      <span className={META_TEXT} data-task-card-field="severity">
        {severity}
      </span>
    );
  }
  return (
    <TextTooltip content={tooltip}>
      <span
        className={`shrink-0 whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-bold leading-none ${getIncidentSeverityTagClasses(severity)}`}
        data-task-card-field="severity"
      >
        {severity}
      </span>
    </TextTooltip>
  );
}

function renderEstimate(item: ResolvedTaskCardSlotItem, estimateLabel: string | undefined) {
  if (!estimateLabel) {
    return null;
  }
  const className = item.presentation === 'tag'
    ? `${CHIP} max-w-full truncate border-gray-300 text-gray-700 dark:border-gray-500 dark:text-gray-200`
    : `${META_TEXT} min-w-0 max-w-full truncate`;
  return (
    <span className={className} data-task-card-field="estimate">
      {estimateLabel}
    </span>
  );
}

function renderAssignee(item: ResolvedTaskCardSlotItem, context: TaskCardSlotItemContext) {
  const assignee = context.assignee;
  if (!assignee) {
    return null;
  }
  if (item.presentation === 'text') {
    return (
      <span className={`min-w-0 truncate ${META_TEXT}`} data-task-card-field="assignee">
        {getDisplayShortName(assignee.label)}
      </span>
    );
  }
  return (
    <TaskCardFeatureLaneAssigneeChip
      assigneeAvatarUrl={assignee.avatarUrl}
      assigneeAvatarVariant={assignee.initialsVariant}
      assigneeInitials={assignee.initials}
      assigneeLabel={assignee.label}
    />
  );
}

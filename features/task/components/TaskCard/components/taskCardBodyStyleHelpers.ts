import type { PlanningPhaseCardColorScheme } from '@/hooks/useLocalStorage';
import type { Task, TaskCardVariant } from '@/types';

import { TEAM_COLORS, TEAM_BORDER_COLORS, TEAM_SIDEBAR_COLORS } from '@/constants';
import { isEffectivelyQaTask } from '@/features/task/utils/taskUtils';
import {
  getMonochromeCardBorderClasses,
  getQAStripedPattern,
  getStatusColors,
  resolveStatusForPhaseCardColors,
} from '@/utils/statusColors';

function getMonochromeTaskCardStyles(
  task: Task,
  variant: TaskCardVariant
): {
  qaStripedStyle: ReturnType<typeof getQAStripedPattern> | undefined;
  qaTextAndBorderColor: string;
  teamBorder: string;
  teamColor: string;
} {
  const isQATask = isEffectivelyQaTask(task);
  const backlogColors = getStatusColors('backlog');
  const qaStripedStyle = isQATask ? getQAStripedPattern('backlog') : undefined;
  const teamColor =
    variant === 'sidebar'
      ? `${backlogColors.sidebar || TEAM_SIDEBAR_COLORS[task.team] || 'bg-gray-100 border-gray-300 text-gray-900'} ${backlogColors.sidebarDark || ''}`
      : `${backlogColors.bg || TEAM_COLORS[task.team] || 'bg-gray-100'} ${backlogColors.bgDark || ''}`;
  const teamBorder = getMonochromeCardBorderClasses(task.originalStatus);
  const qaTextAndBorderColor =
    isQATask && qaStripedStyle ? `${backlogColors.text} ${backlogColors.textDark || ''} ${teamBorder}`.trim() : '';

  return { qaStripedStyle, teamColor, teamBorder, qaTextAndBorderColor };
}

function getStatusTaskCardStyles(
  task: Task,
  variant: TaskCardVariant,
  colorScheme: PlanningPhaseCardColorScheme
): {
  qaStripedStyle: ReturnType<typeof getQAStripedPattern> | undefined;
  qaTextAndBorderColor: string;
  teamBorder: string;
  teamColor: string;
} {
  const isQATask = isEffectivelyQaTask(task);
  const statusForColors = resolveStatusForPhaseCardColors(
    colorScheme,
    task.originalStatus,
    task.statusColorKey
  );
  const statusColors = getStatusColors(statusForColors);
  const qaStripedStyle = isQATask ? getQAStripedPattern(statusForColors) : undefined;
  const teamColor =
    variant === 'sidebar'
      ? `${statusColors.sidebar || TEAM_SIDEBAR_COLORS[task.team] || 'bg-gray-100 border-gray-300 text-gray-900'} ${statusColors.sidebarDark || ''}`
      : `${statusColors.bg || TEAM_COLORS[task.team] || 'bg-gray-100'} ${statusColors.bgDark || ''}`;
  const teamBorder = `${statusColors.border || TEAM_BORDER_COLORS[task.team] || 'border-gray-300'} ${statusColors.borderDark || ''}`;
  const qaTextAndBorderColor =
    isQATask && qaStripedStyle
      ? `${statusColors.text} ${statusColors.textDark || ''} ${statusColors.border} ${statusColors.borderDark || ''}`
      : '';

  return { qaStripedStyle, teamColor, teamBorder, qaTextAndBorderColor };
}

export function getTaskCardStyles(
  task: Task,
  variant: TaskCardVariant = 'swimlane',
  colorScheme: PlanningPhaseCardColorScheme = 'status'
) {
  if (colorScheme === 'monochrome') {
    return getMonochromeTaskCardStyles(task, variant);
  }
  return getStatusTaskCardStyles(task, variant, colorScheme);
}

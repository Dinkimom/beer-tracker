import type { PlanningPhaseCardColorScheme } from '@/hooks/useLocalStorage';
import type { Developer, Task } from '@/types';

import { getTaskCardStyles } from '@/features/task/components/TaskCard/components/TaskCardBody';
import { getTaskPoints } from '@/features/task/utils/taskUtils';
import { storyPointsToTimeslots } from '@/lib/pointsUtils';
import { getTeamTagClasses } from '@/utils/teamColors';

export function buildOccupancyAddPhaseGhostLayout(params: {
  assignee?: Developer;
  isTargetQa: boolean;
  phaseCardColorScheme: PlanningPhaseCardColorScheme;
  qaAssignee?: Developer;
  startCell: number;
  targetTask: Task;
  task: Task;
  totalParts: number;
}): {
  badgeClass: string | undefined;
  cardStyles: ReturnType<typeof getTaskCardStyles>;
  endCell: number;
  initials: string;
  leftPercent: number;
  rightPercent: number;
  targetAvatarUrl: string | null;
} {
  const { assignee, isTargetQa, phaseCardColorScheme, qaAssignee, startCell, targetTask, task, totalParts } =
    params;
  const duration = Math.max(
    1,
    Math.min(storyPointsToTimeslots(getTaskPoints(targetTask)), totalParts - startCell)
  );
  const endCell = startCell + duration;
  const cardStyles = getTaskCardStyles(
    isTargetQa ? { ...targetTask, team: 'QA' } : targetTask,
    'swimlane',
    phaseCardColorScheme
  );
  const targetAvatarUrl =
    targetTask === task ? assignee?.avatarUrl ?? null : qaAssignee?.avatarUrl ?? null;
  const nameForInitials =
    targetTask === task
      ? (assignee?.name ?? targetTask.assigneeName)
      : (qaAssignee?.name ?? targetTask.assigneeName);
  const initials =
    nameForInitials
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '—';

  return {
    badgeClass: getTeamTagClasses(isTargetQa ? 'QA' : targetTask.team),
    cardStyles,
    endCell,
    initials,
    leftPercent: (startCell / totalParts) * 100,
    rightPercent: ((totalParts - endCell) / totalParts) * 100,
    targetAvatarUrl,
  };
}

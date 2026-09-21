import type { OccupancyRowFieldsVisibility } from '@/hooks/useLocalStorage';
import type { SidebarTasksTab, Task } from '@/types';

const DEFAULT_OCCUPANCY_ROW_FIELDS: OccupancyRowFieldsVisibility = {
  showAssignee: true,
  showKey: true,
  showPriority: true,
  showQa: true,
  showSeverity: true,
  showStatus: true,
  showStoryPoints: true,
  showTeam: true,
  showTestPoints: true,
  showType: true,
};

export function mergeOccupancyRowFields(
  rowFieldsVisibility?: Partial<OccupancyRowFieldsVisibility>
): OccupancyRowFieldsVisibility {
  return { ...DEFAULT_OCCUPANCY_ROW_FIELDS, ...rowFieldsVisibility };
}

export function shouldShowTestPoints(task: Task, hasQa: boolean, qaTask: Task | null | undefined): boolean {
  if (task.hideTestPointsByIntegration === true) {
    return false;
  }
  return task.team === 'QA' || (hasQa && !!qaTask);
}

export function unplannedWarningMessage(unplannedWarning: SidebarTasksTab | null): string | null {
  if (unplannedWarning === 'all') return 'Не запланирована';
  if (unplannedWarning === 'dev') return 'Не запланирована разработка';
  if (unplannedWarning === 'qa') return 'Не запланировано тестирование';
  return null;
}

export function computeHasAssigneeRowContent(params: {
  assigneeDisplayName?: string;
  fields: OccupancyRowFieldsVisibility;
  qaDisplayName?: string;
  shouldShowTp: boolean;
  task: Task;
}): boolean {
  const { assigneeDisplayName, fields, qaDisplayName, shouldShowTp, task } = params;
  return (
    (fields.showAssignee && !!assigneeDisplayName) ||
    (fields.showAssignee && fields.showTeam && !!task.team && task.team !== 'QA') ||
    (fields.showQa && shouldShowTp && !!qaDisplayName) ||
    (fields.showAssignee &&
      !assigneeDisplayName &&
      !(task.team && fields.showTeam) &&
      !qaDisplayName)
  );
}

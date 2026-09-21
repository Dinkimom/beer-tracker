import { TASK_GROUP_KEY_NO_PARENT, TASK_GROUP_KEY_UNASSIGNED } from '@/features/task/constants/taskGroupKeys';

interface KanbanLaneNameSource {
  assigneeKey?: string;
  assigneeName?: string;
  laneKey?: string;
  laneName?: string;
}

function resolveUnassignedLaneName(
  lane: KanbanLaneNameSource,
  groupByAssignee: boolean,
  t: (key: string) => string
): string | null {
  if (groupByAssignee && lane.assigneeKey === '__unassigned__') {
    return t('task.grouping.unassigned');
  }
  if (lane.laneName === TASK_GROUP_KEY_UNASSIGNED) {
    return t('task.grouping.unassigned');
  }
  return null;
}

function resolveNoParentLaneName(
  lane: KanbanLaneNameSource,
  groupByParent: boolean,
  t: (key: string) => string
): string | null {
  if (groupByParent && lane.laneKey === '__no_parent__') {
    return t('task.grouping.noParent');
  }
  if (lane.laneName === TASK_GROUP_KEY_NO_PARENT) {
    return t('task.grouping.noParent');
  }
  return null;
}

export function resolveKanbanLaneDisplayName(
  lane: KanbanLaneNameSource,
  groupByAssignee: boolean,
  groupByParent: boolean,
  t: (key: string) => string
): string {
  const laneName = lane.assigneeName ?? lane.laneName ?? '';
  return (
    resolveUnassignedLaneName(lane, groupByAssignee, t) ??
    resolveNoParentLaneName(lane, groupByParent, t) ??
    laneName
  );
}

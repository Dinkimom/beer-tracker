import type { OccupancyTaskCellProps } from './occupancyTaskCell.types';
import type { OccupancyTaskCellCompactShared } from './occupancyTaskCellCompactShared';

import {
  formatTaskStoryPointsForDisplay,
  formatTaskTestPointsForDisplay,
} from '@/lib/pointsUtils';

import {
  computeHasAssigneeRowContent,
  mergeOccupancyRowFields,
  shouldShowTestPoints,
  unplannedWarningMessage,
} from './occupancyTaskCellHelpers';

export function buildOccupancyTaskCellViewModel(props: OccupancyTaskCellProps) {
  const tpSource = props.hasQa && props.qaTask ? props.qaTask : props.task;
  const formattedTpCompact = formatTaskTestPointsForDisplay(tpSource, 'compact');
  const formattedTpSpaced = formatTaskTestPointsForDisplay(tpSource, 'spaced');
  const shouldShowTp = shouldShowTestPoints(props.task, props.hasQa, props.qaTask ?? null);
  const unplannedMsg = unplannedWarningMessage(props.unplannedWarning);

  const rawFields = mergeOccupancyRowFields(props.rowFieldsVisibility);
  const fields = {
    ...rawFields,
    showTestPoints:
      rawFields.showTestPoints && props.task.hideTestPointsByIntegration !== true,
  };
  const formattedSp = formatTaskStoryPointsForDisplay(props.task, 'spaced');
  const formattedTp = formattedTpSpaced;

  const hasAssigneeRowContent = computeHasAssigneeRowContent({
    assigneeDisplayName: props.assigneeDisplayName,
    fields,
    qaDisplayName: props.qaDisplayName,
    shouldShowTp,
    task: props.task,
  });

  const compactShared: OccupancyTaskCellCompactShared = {
    assigneeDisplayName: props.assigneeDisplayName,
    devAvatarUrl: props.devAvatarUrl,
    devAvatarVariant: props.devAvatarVariant ?? 'default',
    devInitials: props.devInitials,
    displayKey: props.displayKey,
    fields,
    formattedSp,
    formattedTp,
    qaAvatarUrl: props.qaAvatarUrl,
    qaDisplayName: props.qaDisplayName,
    qaInitials: props.qaInitials,
    shouldShowTp,
    task: props.task,
  };

  return {
    compactShared,
    fields,
    formattedTpCompact,
    hasAssigneeRowContent,
    shouldShowTp,
    unplannedMsg,
  };
}

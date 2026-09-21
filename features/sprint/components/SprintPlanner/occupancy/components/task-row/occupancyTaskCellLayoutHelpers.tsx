import type { OccupancyTaskCellProps } from './occupancyTaskCell.types';
import type { OccupancyRowFieldsVisibility } from '@/hooks/useLocalStorage';
import type { ReactNode } from 'react';

import { OccupancyTaskCellCompactSingleRowLayout, OccupancyTaskCellCompactWithFactLayout } from './OccupancyTaskCellCompactLayouts';
import { OccupancyTaskCellStandardLayout } from './OccupancyTaskCellStandardLayout';

export function resolveOccupancyTaskCellContent(input: {
  assigneeDisplayName?: string;
  compactShared: {
    assigneeDisplayName?: string;
    devAvatarUrl?: string | null;
    devAvatarVariant: OccupancyTaskCellProps['devAvatarVariant'];
    devInitials?: string;
    displayKey: string;
    fields: OccupancyRowFieldsVisibility;
    formattedSp: string;
    formattedTp: string;
    qaAvatarUrl?: string | null;
    qaDisplayName?: string;
    qaInitials?: string;
    shouldShowTp: boolean;
    task: OccupancyTaskCellProps['task'];
  };
  displayKey: string;
  fields: OccupancyRowFieldsVisibility;
  formattedTpCompact: string;
  hasAssigneeRowContent: boolean;
  hasFact: boolean;
  legacyCompactLayout: boolean;
  qaDisplayName?: string;
  shouldShowTp: boolean;
  task: OccupancyTaskCellProps['task'];
  unplannedMsg: string | null;
}): ReactNode {
  if (!input.legacyCompactLayout) {
    return (
      <OccupancyTaskCellStandardLayout
        assigneeDisplayName={input.assigneeDisplayName}
        displayKey={input.displayKey}
        fields={input.fields}
        formattedTpCompact={input.formattedTpCompact}
        hasAssigneeRowContent={input.hasAssigneeRowContent}
        qaDisplayName={input.qaDisplayName}
        shouldShowTp={input.shouldShowTp}
        task={input.task}
        unplannedMessage={input.unplannedMsg}
      />
    );
  }
  if (input.hasFact) {
    return (
      <OccupancyTaskCellCompactWithFactLayout
        {...input.compactShared}
        devAvatarVariant={input.compactShared.devAvatarVariant ?? 'default'}
      />
    );
  }
  return (
    <OccupancyTaskCellCompactSingleRowLayout
      {...input.compactShared}
      devAvatarVariant={input.compactShared.devAvatarVariant ?? 'default'}
    />
  );
}

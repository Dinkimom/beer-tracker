'use client';

import type { DeveloperHeaderLaneLabelItem } from '@/features/swimlane/components/DeveloperHeaderLaneLabels';
import type { Developer } from '@/types';

import { DeveloperHeader } from '@/features/swimlane/components/DeveloperHeader';
import { FeatureLaneDraftRowActions } from '@/features/swimlane/components/FeatureLaneDraftRowActions';
import { FeatureLaneRowTitle } from '@/features/swimlane/components/FeatureLaneRowTitle';
import { SwimlanePinControl } from '@/features/swimlane/components/SwimlanePinControl';
import { SwimlaneRowBorderResizeHandle } from '@/features/swimlane/components/SwimlaneRowBorderResizeHandle';
import { isFeatureLaneDraftRowId } from '@/features/swimlane/utils/featureSwimlaneRows';
import { useFeatureLaneColumnUi } from '@/features/task/components/TaskCard/FeatureLaneCardUiContext';

interface SwimlaneDeveloperHeaderProps {
  developer: Developer;
  isPinned: boolean;
  isTeamLane: boolean;
  laneLabels: DeveloperHeaderLaneLabelItem[];
  layout: {
    completedSP: number;
    completedTP: number;
    hasVolumeTasks: boolean;
    percentSP: number;
    percentTP: number;
    totalHeight: number;
    totalSP: number;
    totalTP: number;
  };
  participantsColumnWidth: number;
  rowResize: {
    handleBorderMouseEnter: () => void;
    handleBorderMouseLeave: () => void;
    handleResizeStart: (event: React.MouseEvent) => void;
    isBorderHovered: boolean;
    isResizing: boolean;
  };
  /** Низ всей строки (задачи + факт + календарь) — позиция ручки высоты. */
  rowResizeHandleTopPx: number;
  onTogglePin?: (assigneeId: string) => void;
}

/** Колонка исполнителя: шапка строки и ручка высоты на её нижней границе. */
export function SwimlaneDeveloperHeader({
  developer,
  isPinned,
  isTeamLane,
  laneLabels,
  layout,
  onTogglePin,
  participantsColumnWidth,
  rowResize,
  rowResizeHandleTopPx,
}: SwimlaneDeveloperHeaderProps) {
  const featureColumn = useFeatureLaneColumnUi();
  const featureTitle = featureColumn.rowTitleById.get(developer.id);
  const isDraftRow = isFeatureLaneDraftRowId(developer.id);
  const showRowActions = featureColumn.isFeatureLane;
  return (
    <DeveloperHeader
      avatarUrl={developer.avatarUrl}
      completedSP={layout.completedSP}
      completedTP={layout.completedTP}
      developerName={developer.name}
      hasTasks={layout.hasVolumeTasks}
      hideAvatar={featureColumn.isFeatureLane}
      laneLabels={laneLabels}
      nameContent={
        featureTitle ? (
          <FeatureLaneRowTitle
            issueKey={featureTitle.key}
            issueType={featureTitle.issueType}
            title={featureTitle.title}
            onRename={
              isDraftRow && featureColumn.renameFeatureRow
                ? (name) => featureColumn.renameFeatureRow?.(developer.id, name)
                : undefined
            }
          />
        ) : undefined
      }
      percentSP={layout.percentSP}
      percentTP={layout.percentTP}
      persistentActions={
        <div className="flex h-6 items-center gap-0.5 leading-none">
          {showRowActions ? <FeatureLaneDraftRowActions rowId={developer.id} /> : null}
          <SwimlanePinControl
            assigneeId={developer.id}
            isPinned={isPinned}
            onTogglePin={onTogglePin}
          />
        </div>
      }
      role={developer.role}
      rowResizeHandle={
        <SwimlaneRowBorderResizeHandle
          isBorderHovered={rowResize.isBorderHovered}
          isResizing={rowResize.isResizing}
          onMouseDown={rowResize.handleResizeStart}
          onMouseEnter={rowResize.handleBorderMouseEnter}
          onMouseLeave={rowResize.handleBorderMouseLeave}
        />
      }
      rowResizeHandleTopPx={rowResizeHandleTopPx}
      showBothPointKinds={featureColumn.isFeatureLane}
      showProgress
      taskAreaHeight={layout.totalHeight}
      totalSP={layout.totalSP}
      totalTP={layout.totalTP}
      variant={isTeamLane ? 'team' : 'person'}
      width={participantsColumnWidth}
    />
  );
}

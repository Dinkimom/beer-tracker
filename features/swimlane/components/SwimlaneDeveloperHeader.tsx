'use client';

import type { DeveloperHeaderLaneLabelItem } from '@/features/swimlane/components/DeveloperHeaderLaneLabels';
import type { SwimlanePointTotals } from '@/features/swimlane/hooks/useSwimlaneLayoutHelpers';
import type { Developer } from '@/types';

import { getAvatarVariantForDeveloper } from '@/components/Avatar';
import { ZIndex } from '@/constants';
import { DeveloperHeader } from '@/features/swimlane/components/DeveloperHeader';
import { FeatureLaneDraftRowActions } from '@/features/swimlane/components/FeatureLaneDraftRowActions';
import { FeatureLaneRowTitle } from '@/features/swimlane/components/FeatureLaneRowTitle';
import { SwimlanePinControl } from '@/features/swimlane/components/SwimlanePinControl';
import { SwimlaneRowBorderResizeHandle } from '@/features/swimlane/components/SwimlaneRowBorderResizeHandle';
import { useAssigneeVelocityReadout } from '@/features/swimlane/hooks/useAssigneeVelocity';
import { isFeatureLaneDraftRowId } from '@/features/swimlane/utils/featureSwimlaneRows';
import { useFeatureLaneColumnUi } from '@/features/task/components/TaskCard/FeatureLaneCardUiContext';

interface SwimlaneDeveloperHeaderProps {
  developer: Developer;
  isPinned: boolean;
  isTeamLane: boolean;
  laneLabels: DeveloperHeaderLaneLabelItem[];
  layout: {
    points: SwimlanePointTotals;
    totalHeight: number;
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
  const velocityReadout = useAssigneeVelocityReadout(
    developer.id,
    developer.name,
    developer.role,
    layout.points.hideTestPoints
  );
  const featureTitle = featureColumn.rowTitleById.get(developer.id);
  const isDraftRow = isFeatureLaneDraftRowId(developer.id);
  const showRowActions = featureColumn.isFeatureLane;
  return (
    <DeveloperHeader
      avatarInitialsVariant={getAvatarVariantForDeveloper(developer)}
      avatarUrl={developer.avatarUrl}
      developerName={developer.name}
      frosted={isPinned}
      hideAvatar={featureColumn.isFeatureLane}
      laneLabels={laneLabels}
      layerZIndex={isPinned ? ZIndex.stickyPinnedRows : ZIndex.stickyLeftColumn}
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
      points={layout.points}
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
      variant={isTeamLane ? 'team' : 'person'}
      velocity={isTeamLane || featureColumn.isFeatureLane ? null : velocityReadout}
      width={participantsColumnWidth}
    />
  );
}

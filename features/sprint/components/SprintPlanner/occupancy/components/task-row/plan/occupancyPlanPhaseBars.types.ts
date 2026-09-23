import type { TimelineSettings } from '../../table/OccupancyTableHeader';
import type { PositionPreview, PositionPreviewChangeOptions } from './occupancyPhaseBar.types';
import type { Developer, Task, TaskPosition } from '@/types';
import type React from 'react';

export interface OccupancyPlanPhaseBarsProps {
  cellsPerDay: 1 | 3;
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  displayAsWeeks: boolean;
  effectivelyQa: boolean;
  hoverConnectedPhaseIds?: Set<string> | null;
  hoveredErrorTaskId?: string | null;
  initials: string;
  linkAlreadyExistsFromSource: boolean;
  linkedQaPreviewStart: number | null;
  linkingFromTaskId: string | null;
  occupancyErrorTaskIds: Set<string>;
  overlappingTaskIds?: Set<string>;
  phaseBarHeightPx: number;
  phaseBarTopOffsetPx: number;
  position: TaskPosition | undefined;
  positionAssignee?: Developer;
  positionPreviews: Map<string, PositionPreview>;
  /** QA-инженер по задаче — fallback аватара, если нет qaPosition или нет записи по position.assignee */
  qaAssignee?: Developer;
  qaInitials: string;
  qaPosition: TaskPosition | undefined;
  qaPositionAssignee?: Developer;
  qaTask: Task | undefined;
  quarterlyPhaseStyle: boolean;
  segmentEditTaskId: string | null;
  task: Task;
  timelineSettings: TimelineSettings;
  totalParts: number;
  validTargetByTime: boolean;
  fromWeekPosition: (pos: TaskPosition) => TaskPosition;
  getErrorTooltip: (taskId: string) => string;
  handleDevPositionSave: (p: TaskPosition) => Promise<void>;
  handleDevPreviewChange: (
    preview: PositionPreview | null,
    options?: PositionPreviewChangeOptions
  ) => void;
  handlePositionPreview: (
    taskId: string,
    preview: PositionPreview | null,
    options?: PositionPreviewChangeOptions
  ) => void;
  onCompleteLink?: (toTaskId: string) => void;
  onContextMenu?: (e: React.MouseEvent, task: Task, isBacklogTask?: boolean, hideRemoveFromPlan?: boolean) => void;
  onPositionSave?: (position: TaskPosition, isQa: boolean, devTaskKey?: string) => Promise<void> | void;
  onSegmentEditCancel?: () => void;
  onSegmentEditSave?: (position: TaskPosition, segments: Array<{ startDay: number; startPart: number; duration: number }>, isQa: boolean) => void;
  setHoveredPhaseTaskId?: (taskId: string | null) => void;
  toWeekPosition: (pos: TaskPosition) => TaskPosition;
}

import type { Task, TaskPosition } from '@/types';

export type PositionPreview = Pick<
  TaskPosition,
  'duration' | 'startDay' | 'startPart'
>;

export interface OccupancyPhaseBarProps {
  assigneeDisplayName?: string | null;
  avatarUrl?: string | null;
  badgeClass?: string;
  barHeight?: number;
  barTopOffset?: number;
  cellsPerDay?: 1 | 3;
  /** Затемнить остальные фазы, когда открыто контекстное меню с якорем (как у карточек). */
  contextMenuBlurOtherCards?: boolean;
  contextMenuTaskId?: string | null;
  disableDragAndResize?: boolean;
  elevationAbove?: boolean;
  errorTooltip?: string;
  externalDragStartCell?: number | null;
  forceDevColor?: boolean;
  /** Жёлтая полоса discovery (квартальный план). */
  forceDiscoveryColor?: boolean;
  forceReleaseStyle?: boolean;
  /** Не рисовать центр полосы (аватар, эмодзи, подписи). */
  hideCenterContent?: boolean;
  hideExtraDuration?: boolean;
  hideLinkRing?: boolean;
  hoveredErrorTaskId?: string | null;
  /** DOM id полосы для SVG-стрелок; по умолчанию `occupancy-phase-${taskId}`. */
  htmlAnchorId?: string;
  initials: string;
  /** Пунктир между недельными ячейками внутри полосы (квартальный план). */
  internalWeekDividers?: boolean;
  isBlurredBySiblingDrag?: boolean;
  isDimmedByLinkHover?: boolean;
  isInError?: boolean;
  isInHoveredConnectionGroup?: boolean;
  isLinkSource?: boolean;
  isLinkTarget?: boolean;
  isOverlapping?: boolean;
  isQa: boolean;
  originalStatus?: string;
  phaseDateRangeLabel?: string;
  phaseDurationLabel?: string;
  plannedInSprintVariant?: boolean;
  /** Горизонтальный отступ полосы от краёв ячейки (по умолчанию PHASE_PLAN_ROW_INSET_PX). */
  planRowInsetPx?: number;
  pointerEventsNone?: boolean;
  position: TaskPosition;
  readonly?: boolean;
  /** Несколько отрезков плана — бейдж «i/N» как на карточке свимлейна */
  segmentBadge?: { index: number; total: number } | null;
  showToolsEmoji?: boolean;
  /** Без скругления (квартальный планер). */
  squareCorners?: boolean;
  task: Task;
  taskId: string;
  teamBorder: string;
  teamColor: string;
  teamPlanVariant?: boolean;
  totalParts?: number;
  onCompleteLink?: (toTaskId: string) => void;
  onContextMenu?: (
    e: React.MouseEvent,
    task: Task,
    isBacklogTask?: boolean,
    hideRemoveFromPlan?: boolean
  ) => void;
  onPhaseHoverEnter?: () => void;
  onPhaseHoverLeave?: () => void;
  onPreviewChange?: (preview: PositionPreview | null) => void;
  onSave?: (position: TaskPosition) => void;
}

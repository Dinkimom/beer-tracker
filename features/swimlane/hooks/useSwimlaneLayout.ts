/**
 * Хук для расчета layout свимлейна (слои, позиции, высота)
 */

import type { Task, TaskPosition } from '@/types';

import { reaction } from 'mobx';
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';

import { WORKING_DAYS, getPartsPerDay } from '@/constants';
import {
  buildSwimlaneTaskLayerSpanById,
  buildSwimlaneTaskVerticalLayoutById,
  calculateBaselines,
  distributeBaselinesToLayers,
  distributeTasksToLayers,
} from '@/features/swimlane/utils/layerUtils';
import { buildSwimlaneOccupiedLayersByCell } from '@/features/swimlane/utils/swimlaneCellOccupancy';
import { resolveEffectiveSwimlaneReservedTaskLayersPreview } from '@/features/swimlane/utils/swimlaneRowReservedLayers';
import { useSprintBoardPresenceViewers } from '@/features/task/components/TaskCard/SprintCardPresenceContext';
import { applyTaskResizePreviewToPositionedTasks } from '@/features/task/hooks/useTaskResizeHelpers';
import { buildEffectiveStickyNoteCardRowById, mergeStickyNoteCardRowOverrideMaps, type StickyNoteCardRowLayout } from '@/features/task/utils/stickyNoteCardRowResizeHelpers';
import {
  useSwimlaneBaselineLayoutModeStorage,
  useSwimlaneCardFieldsStorage,
} from '@/hooks/useLocalStorage';
import { useRootStore } from '@/lib/layers';
import {
  remotePresenceCardRowPreviews,
  remotePresenceResizePreview,
} from '@/lib/realtime/sprintPresenceGesture';
import {
  persistedPositionForPreviewLatch,
  presenceCardRowMapsEqual,
  presencePositionPreviewEquals,
  resolveRetainedLocalResizePreview,
  retainPresencePositionPreview,
  retainRemotePresenceCardRows,
  type PresencePositionPreviewLatch,
} from '@/lib/realtime/sprintPresenceGestureRetain';
import { getBrowserRealtimeClientId } from '@/lib/realtime/sprintRealtimeClientId';
import { resolveSwimlaneBaselinesForLayerPacking } from '@/lib/swimlane/swimlaneBaselineLayoutMode';
import { getCurrentSprintCell } from '@/utils/dateUtils';

import {
  applyRemotePresenceCardRowPreviews,
  applyRemotePresencePositionToDeveloperTasks,
  buildPositionedTasksForDeveloper,
  computeSwimlaneLayoutDimensions,
  computeSwimlanePointTotals,
} from './useSwimlaneLayoutHelpers';

interface UseSwimlaneLayoutProps {
  commentCardRowById?: ReadonlyMap<string, StickyNoteCardRowLayout>;
  developerId: string;
  /** Локальный drag: не применять свой presence-жест к карточке, которую уже тащим. */
  draggingTaskId?: string | null;
  /** Временный минимум слоёв со stacked-зазором, если «+» стартует ниже первого слоя. */
  hoverMinTaskLayers?: number;
  /** Временный минимум слоёв для hover 2×2 «+» на первом слое (как у фото). */
  previewSpanLayers?: number;
  reservedTaskLayers?: number;
  reservedTaskLayersPreview?: number | null;
  sprintStartDate: Date;
  sprintTimelineWorkingDays?: number;
  taskPositions: Map<string, TaskPosition>;
  /** Карта всех задач: по ней определяем, что реально лежит в свимлейне (по позициям на доске). */
  tasksMap: Map<string, Task>;
}

/** Задачи в свимлейне = только те, у кого в taskPositions assignee совпадает с developerId (то, что лежит на строке). */
export function useSwimlaneLayout({
  commentCardRowById,
  developerId,
  draggingTaskId = null,
  hoverMinTaskLayers,
  previewSpanLayers,
  reservedTaskLayers,
  reservedTaskLayersPreview = null,
  sprintStartDate,
  sprintTimelineWorkingDays = WORKING_DAYS,
  taskPositions,
  tasksMap,
}: UseSwimlaneLayoutProps) {
  const { sprintPlannerUi } = useRootStore();
  const subscribeCardLayout = useCallback(
    (onStoreChange: () => void) =>
      reaction(() => sprintPlannerUi.cardLayoutRevision, onStoreChange),
    [sprintPlannerUi]
  );
  const readCardLayoutRevision = useCallback(
    () => sprintPlannerUi.cardLayoutRevision,
    [sprintPlannerUi]
  );
  useSyncExternalStore(subscribeCardLayout, readCardLayoutRevision, readCardLayoutRevision);
  const [presenceLatch, setPresenceLatch] = useState<{
    cardRows: Map<string, { layerShiftUp: number; span: number }>;
    localResize: PresencePositionPreviewLatch | null;
    localResizeDiscardEpoch: number;
    remoteResize: PresencePositionPreviewLatch | null;
  }>(() => ({
    cardRows: new Map(),
    localResize: null,
    localResizeDiscardEpoch: 0,
    remoteResize: null,
  }));
  const mergedOverrides = mergeStickyNoteCardRowOverrideMaps(
    commentCardRowById ?? new Map(),
    sprintPlannerUi.stickyNoteCardRowOverrides
  );
  const ownClientId = getBrowserRealtimeClientId() || null;
  const boardViewers = useSprintBoardPresenceViewers();
  const localBusyTaskId =
    draggingTaskId ||
    sprintPlannerUi.resizingTaskId ||
    sprintPlannerUi.taskResizePreview?.taskId ||
    sprintPlannerUi.boardDraggingTaskId ||
    sprintPlannerUi.stickyNoteCardRowPreview?.taskId ||
    null;
  const remoteCardRows = retainRemotePresenceCardRows(
    remotePresenceCardRowPreviews(boardViewers, ownClientId),
    presenceLatch.cardRows,
    mergedOverrides
  );
  const stickyNoteCardRowById = applyRemotePresenceCardRowPreviews(
    buildEffectiveStickyNoteCardRowById({
      overrides: mergedOverrides,
      preview: sprintPlannerUi.stickyNoteCardRowPreview,
    }),
    remoteCardRows,
    localBusyTaskId
  );
  const [swimlaneCardFields] = useSwimlaneCardFieldsStorage();
  const [baselineLayoutMode] = useSwimlaneBaselineLayoutModeStorage();

  // Нельзя useMemo([taskPositions, …]): taskPositions — тот же observable.map, при DnD мутирует на месте,
  // ссылка не меняется — positionedTasks оставался со старыми координатами (занятость жила отдельным путём).
  const totalCells = sprintTimelineWorkingDays * getPartsPerDay();
  const localResizeLive = sprintPlannerUi.taskResizePreview;
  const resolvedLocalResize = resolveRetainedLocalResizePreview({
    discardEpoch: sprintPlannerUi.localTaskResizeDiscardEpoch,
    latched: presenceLatch.localResize,
    latchedEpoch: presenceLatch.localResizeDiscardEpoch,
    live: localResizeLive,
    persisted: persistedPositionForPreviewLatch(
      localResizeLive,
      presenceLatch.localResize,
      taskPositions
    ),
  });
  const localResizeForLayout = resolvedLocalResize.preview;
  const remoteResizePreview = remotePresenceResizePreview(boardViewers, ownClientId);
  const remoteResizeLive =
    remoteResizePreview && remoteResizePreview.taskId === localBusyTaskId
      ? null
      : remoteResizePreview;
  const remotePreviewForLayout = retainPresencePositionPreview(
    remoteResizeLive,
    presenceLatch.remoteResize,
    persistedPositionForPreviewLatch(remoteResizeLive, presenceLatch.remoteResize, taskPositions)
  );
  if (
    !presenceCardRowMapsEqual(remoteCardRows, presenceLatch.cardRows) ||
    !presencePositionPreviewEquals(localResizeForLayout, presenceLatch.localResize) ||
    resolvedLocalResize.epoch !== presenceLatch.localResizeDiscardEpoch ||
    !presencePositionPreviewEquals(remotePreviewForLayout, presenceLatch.remoteResize)
  ) {
    setPresenceLatch({
      cardRows: remoteCardRows,
      localResize: localResizeForLayout,
      localResizeDiscardEpoch: resolvedLocalResize.epoch,
      remoteResize: remotePreviewForLayout,
    });
  }
  const positionedTasks = applyRemotePresencePositionToDeveloperTasks(
    applyTaskResizePreviewToPositionedTasks(
      buildPositionedTasksForDeveloper(developerId, taskPositions, tasksMap),
      localResizeForLayout,
      totalCells
    ),
    remotePreviewForLayout,
    developerId,
    taskPositions,
    tasksMap,
    totalCells
  );

  const { totalSP, totalTP, completedSP, completedTP, hasVolumeTasks } =
    computeSwimlanePointTotals(positionedTasks);
  const percentSP = totalSP > 0 ? Math.round((completedSP / totalSP) * 100) : 0;
  const percentTP = totalTP > 0 ? Math.round((completedTP / totalTP) * 100) : 0;

  const currentCell = useMemo(() => {
    return getCurrentSprintCell(sprintStartDate, getPartsPerDay(), sprintTimelineWorkingDays);
  }, [sprintStartDate, sprintTimelineWorkingDays]);

  const baselines = calculateBaselines(positionedTasks, currentCell);
  const packingBaselines = resolveSwimlaneBaselinesForLayerPacking(baselines, baselineLayoutMode);
  const taskVerticalLayoutById = buildSwimlaneTaskVerticalLayoutById(
    positionedTasks,
    stickyNoteCardRowById
  );
  const taskLayerSpanById = buildSwimlaneTaskLayerSpanById(
    positionedTasks,
    stickyNoteCardRowById
  );
  const taskLayerMap = distributeTasksToLayers(
    positionedTasks,
    packingBaselines,
    stickyNoteCardRowById
  );
  const baselineLayerMap = distributeBaselinesToLayers(packingBaselines);
  const occupiedLayersByCell = buildSwimlaneOccupiedLayersByCell(
    positionedTasks.map(({ position }) => position),
    taskLayerMap,
    taskLayerSpanById,
    packingBaselines,
    taskVerticalLayoutById
  );

  const layoutInputBase = {
    baselineLayerMap,
    showParent: swimlaneCardFields.showParent,
    taskLayerMap,
    taskLayerSpanById,
    taskVerticalLayoutById,
  };

  const contentLayout = computeSwimlaneLayoutDimensions(layoutInputBase);
  const effectiveReservedTaskLayersPreview = resolveEffectiveSwimlaneReservedTaskLayersPreview({
    contentMaxTaskLayers: contentLayout.contentMaxTaskLayers,
    preview: reservedTaskLayersPreview,
    stored: reservedTaskLayers,
  });
  const userReservedLayers = effectiveReservedTaskLayersPreview ?? reservedTaskLayers;
  const minTaskLayers = Math.max(
    contentLayout.contentMaxTaskLayers,
    userReservedLayers ?? 1,
    hoverMinTaskLayers ?? 1
  );
  const extraPreviewSpanLayers = Math.max(1, previewSpanLayers ?? 1);
  const needsExtraLayers =
    minTaskLayers > contentLayout.contentMaxTaskLayers ||
    extraPreviewSpanLayers > contentLayout.contentMaxTaskLayers;

  const {
    baseHeight,
    baselineLayerHeight,
    contentMaxTaskLayers,
    hasBaselineOverlaps,
    hasTaskOverlaps,
    layerHeight,
    maxBaselineLayers,
    maxTaskLayers,
    taskBandTotalHeight,
    taskBandVisualHeight,
    totalHeight,
  } = needsExtraLayers
    ? computeSwimlaneLayoutDimensions({
        ...layoutInputBase,
        minTaskLayers,
        previewSpanLayers: extraPreviewSpanLayers,
      })
    : contentLayout;

  return {
    positionedTasks,
    stickyNoteCardRowById,
    totalSP,
    totalTP,
    completedSP,
    completedTP,
    hasVolumeTasks,
    percentSP,
    percentTP,
    currentCell,
    baselines,
    taskLayerMap,
    baselineLayerMap,
    contentMaxTaskLayers,
    maxTaskLayers,
    maxBaselineLayers,
    hasBaselineOverlaps,
    hasTaskOverlaps,
    baseHeight,
    layerHeight,
    totalHeight,
    taskBandTotalHeight,
    taskBandVisualHeight,
    baselineLayerHeight,
    occupiedLayersByCell,
  };
}

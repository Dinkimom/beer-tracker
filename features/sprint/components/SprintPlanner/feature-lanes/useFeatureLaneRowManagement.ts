import type { Developer, Task } from '@/types';

import { useCallback, useMemo } from 'react';

import { useParentTypes } from '@/features/sprint/components/SprintPlanner/occupancy/hooks/useParentTypes';
import {
  mergeFeatureSwimlaneBoardRows,
  moveFeatureSwimlaneRowOrder,
} from '@/features/swimlane/utils/featureSwimlaneRowOrder';
import {
  buildFeatureLaneRowTitleById,
  createFeatureLaneDraftRow,
  isFeatureLaneDraftParent,
  isFeatureLaneDraftRowId,
  mergeFeatureLaneDraftRowMeta,
  mergeFeatureLaneTrackerTypes,
  type FeatureLaneBoardLabels,
  type FeatureSwimlaneRowMeta,
} from '@/features/swimlane/utils/featureSwimlaneRows';
import {
  emptyFeatureLanesDocument,
  pinFeatureLaneTrackerRow,
  renameFeatureLaneDraftRow,
  replaceFeatureLaneDraftRow,
  type FeatureLanesDocument,
} from '@/lib/sprints/featureLanesDocument';
import { TEAM_SWIMLANE_ASSIGNEE_ID } from '@/lib/swimlane/teamSwimlaneAssignee';

import { resolveFeatureLaneTransferRow } from './submitFeatureLaneRowSprintChange';

function draftRowsToDevelopers(lanes: FeatureLanesDocument | undefined): Developer[] {
  return (lanes?.draftRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    role: 'other',
  }));
}

export function useFeatureLaneRowManagement(input: {
  boardLabels: FeatureLaneBoardLabels;
  lanes: FeatureLanesDocument | undefined;
  projectionRows: Developer[];
  rowMetaById: Map<string, FeatureSwimlaneRowMeta>;
  sprintId: number | null;
  tasks: readonly Task[];
  setLanes: (updater: (prev: FeatureLanesDocument | undefined) => FeatureLanesDocument) => void;
}) {
  const lanes = input.lanes;
  const setLanes = input.setLanes;
  const draftRows = useMemo(() => draftRowsToDevelopers(lanes), [lanes]);
  const orderIds = useMemo(() => lanes?.orderIds ?? [], [lanes]);
  const hiddenIds = useMemo(() => new Set(lanes?.hiddenIds ?? []), [lanes]);

  const allRows = useMemo(
    () =>
      mergeFeatureSwimlaneBoardRows({
        draftRows,
        orderIds,
        projectionRows: input.projectionRows,
      }),
    [draftRows, input.projectionRows, orderIds]
  );

  const rowMetaById = useMemo(
    () => mergeFeatureLaneDraftRowMeta(input.rowMetaById, draftRows),
    [draftRows, input.rowMetaById]
  );

  const parentKeys = useMemo(() => {
    const keys: string[] = [];
    for (const meta of rowMetaById.values()) {
      if (isFeatureLaneDraftRowId(meta.rowId) || isFeatureLaneDraftParent(meta.parent)) {
        continue;
      }
      const key = meta.parent?.key?.trim();
      if (key) {
        keys.push(key);
      }
    }
    return keys;
  }, [rowMetaById]);
  const parentTypesQuery = useParentTypes(parentKeys);
  const trackerTypes = useMemo(
    () => mergeFeatureLaneTrackerTypes(parentTypesQuery.data, input.tasks),
    [input.tasks, parentTypesQuery.data]
  );

  const rowTitleById = useMemo(
    () =>
      buildFeatureLaneRowTitleById(allRows, rowMetaById, input.boardLabels, trackerTypes),
    [allRows, input.boardLabels, rowMetaById, trackerTypes]
  );

  const visibleDevelopers = useMemo(
    () => allRows.filter((row) => !hiddenIds.has(row.id)),
    [allRows, hiddenIds]
  );

  const patchLanes = useCallback(
    (patch: (current: FeatureLanesDocument) => FeatureLanesDocument) => {
      setLanes((prev) => patch(prev ?? emptyFeatureLanesDocument()));
    },
    [setLanes]
  );

  const toggleDeveloperVisibility = useCallback(
    (rowId: string) => {
      patchLanes((current) => {
        const hidden = new Set(current.hiddenIds);
        if (hidden.has(rowId)) {
          hidden.delete(rowId);
        } else {
          hidden.add(rowId);
        }
        return { ...current, hiddenIds: [...hidden] };
      });
    },
    [patchLanes]
  );

  const showAllDevelopers = useCallback(() => {
    patchLanes((current) => ({ ...current, hiddenIds: [] }));
  }, [patchLanes]);

  const hideAllDevelopers = useCallback(() => {
    patchLanes((current) => ({
      ...current,
      hiddenIds: allRows.map((row) => row.id),
    }));
  }, [allRows, patchLanes]);

  const handleDragEnd = useCallback(
    (activeId: string, overId: string) => {
      if (activeId === TEAM_SWIMLANE_ASSIGNEE_ID) {
        return;
      }
      const visualOrderIds = allRows.map((row) => row.id);
      patchLanes((current) => {
        const currentOrder = mergeFeatureSwimlaneBoardRows({
          draftRows: draftRowsToDevelopers(current),
          orderIds: current.orderIds,
          previousOrderIds: visualOrderIds,
          projectionRows: input.projectionRows,
        }).map((row) => row.id);
        return {
          ...current,
          orderIds: moveFeatureSwimlaneRowOrder(currentOrder, activeId, overId),
        };
      });
    },
    [allRows, input.projectionRows, patchLanes]
  );

  const addDraftRow = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return;
      }
      const row = createFeatureLaneDraftRow(trimmed);
      patchLanes((current) => ({
        ...current,
        draftRows: [...current.draftRows, { id: row.id, name: row.name }],
      }));
    },
    [patchLanes]
  );

  const renameDraftRow = useCallback(
    (rowId: string, name: string) => {
      if (!isFeatureLaneDraftRowId(rowId)) {
        return;
      }
      patchLanes((current) => renameFeatureLaneDraftRow(current, rowId, name));
    },
    [patchLanes]
  );

  const replaceDraftRow = useCallback(
    (rowId: string, next: { id: string; name: string }) => {
      patchLanes((current) => replaceFeatureLaneDraftRow(current, rowId, next));
    },
    [patchLanes]
  );

  const pinTrackerRow = useCallback(
    (next: { id: string; name: string }) => {
      patchLanes((current) => pinFeatureLaneTrackerRow(current, next));
    },
    [patchLanes]
  );

  const removeBoardRow = useCallback(
    (rowId: string) => {
      patchLanes((current) => ({
        draftRows: current.draftRows.filter((row) => row.id !== rowId),
        hiddenIds: current.hiddenIds.filter((id) => id !== rowId),
        orderIds: current.orderIds.filter((id) => id !== rowId),
      }));
    },
    [patchLanes]
  );

  const removeDraftRow = useCallback(
    (rowId: string) => {
      if (!isFeatureLaneDraftRowId(rowId)) {
        return;
      }
      removeBoardRow(rowId);
    },
    [removeBoardRow]
  );

  const resolveTransferRow = useCallback(
    (rowId: string) => resolveFeatureLaneTransferRow(rowId, lanes, rowMetaById),
    [lanes, rowMetaById]
  );

  const developersManagement = useMemo(
    () => ({
      handleDragEnd,
      hiddenIds,
      hideAllDevelopers,
      setSortBy: () => undefined,
      showAllDevelopers,
      sortBy: 'custom' as const,
      sortedDevelopers: allRows,
      toggleDeveloperVisibility,
      visibleDevelopers,
    }),
    [
      allRows,
      handleDragEnd,
      hiddenIds,
      hideAllDevelopers,
      showAllDevelopers,
      toggleDeveloperVisibility,
      visibleDevelopers,
    ]
  );

  return {
    addDraftRow,
    allRows,
    developersManagement,
    pinTrackerRow,
    removeBoardRow,
    removeDraftRow,
    renameDraftRow,
    replaceDraftRow,
    resolveTransferRow,
    rowMetaById,
    rowTitleById,
  };
}

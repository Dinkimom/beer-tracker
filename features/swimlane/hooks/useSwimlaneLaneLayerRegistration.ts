import type { PlacedSwimlaneLayerItem, SwimlaneLayerPackingItem } from '@/features/swimlane/utils/layerUtils';
import type { TaskPosition } from '@/types';

import { useEffect } from 'react';

import { registerSwimlaneLaneLayout } from '@/features/swimlane/utils/swimlaneLaneLayoutRegistry';
import {
  SWIMLANE_STACKED_LAYER_GAP_PX,
  SWIMLANE_TASK_ROW_VERTICAL_INSET_PX,
} from '@/features/swimlane/utils/taskLayerTaskLayout';
import { swimlaneLayerGeometryDataAttributes } from '@/lib/swimlane/swimlaneLayerGeometry';

/**
 * Раскладка строки для drag-end и фиксации при выключении автосортировки + геометрия слоёв в data-атрибутах
 * (`[data-swimlane]`), по которой drag переводит верх карточки в слой.
 */
export function useSwimlaneLaneLayerRegistration(
  laneId: string,
  layout: {
    computeAutoLayerItems: () => readonly PlacedSwimlaneLayerItem[];
    maxTaskLayers: number;
    packLaneItem: (taskId: string, position: TaskPosition) => SwimlaneLayerPackingItem | null;
    placedLayerItems: readonly PlacedSwimlaneLayerItem[];
    taskBandVisualHeight: number;
  },
  band: { hasTaskOverlaps: boolean; layerHeight: number }
): Record<string, string> {
  const { computeAutoLayerItems: computeAuto, packLaneItem: packItem, placedLayerItems: placed } = layout;
  useEffect(
    () => registerSwimlaneLaneLayout(laneId, { computeAuto, packItem, placed }),
    [computeAuto, laneId, packItem, placed]
  );
  const inset = SWIMLANE_TASK_ROW_VERTICAL_INSET_PX;
  const pitchPx = band.hasTaskOverlaps
    ? band.layerHeight + SWIMLANE_STACKED_LAYER_GAP_PX
    : layout.taskBandVisualHeight - inset * 2;
  return swimlaneLayerGeometryDataAttributes({
    layerCount: Math.max(1, layout.maxTaskLayers),
    originPx: inset,
    pitchPx: Math.max(1, pitchPx),
  });
}

import {
  resolveSwimlaneStackedTaskBandHeightPx,
  SWIMLANE_STACKED_LAYER_GAP_PX,
  SWIMLANE_TASK_ROW_VERTICAL_INSET_PX,
} from '@/features/swimlane/utils/taskLayerTaskLayout';

/** Сколько слоёв карточек пользователь может заранее заложить в строке свимлейна. */
export const MAX_SWIMLANE_RESERVED_TASK_LAYERS = 10;

export function resolveSwimlaneOneCardHeightPx(showParent: boolean): number {
  const singleRowHeight = showParent ? 97 : 82;
  return singleRowHeight - SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2;
}

/** Число слоёв карточек по высоте полосы задач (для drag границы строки). */
export function resolveSwimlaneTaskLayerCountFromBandHeightPx(
  bandHeightPx: number,
  oneCardHeightPx: number
): number {
  const singleRowHeight = oneCardHeightPx + SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2;
  if (bandHeightPx <= singleRowHeight) {
    return 1;
  }
  const inset = SWIMLANE_TASK_ROW_VERTICAL_INSET_PX;
  const gap = SWIMLANE_STACKED_LAYER_GAP_PX;
  const inner = bandHeightPx - inset * 2;
  const layers = Math.round((inner + gap) / (oneCardHeightPx + gap));
  return Math.max(1, Math.min(MAX_SWIMLANE_RESERVED_TASK_LAYERS, layers));
}

export function pointerYToSwimlaneReservedTaskLayers(params: {
  contentMinTaskLayers: number;
  oneCardHeightPx: number;
  pointerYInBandPx: number;
}): number {
  const layers = resolveSwimlaneTaskLayerCountFromBandHeightPx(
    params.pointerYInBandPx,
    params.oneCardHeightPx
  );
  return Math.max(
    params.contentMinTaskLayers,
    Math.min(MAX_SWIMLANE_RESERVED_TASK_LAYERS, layers)
  );
}

export function resolveSwimlaneBandHeightPxForTaskLayers(
  layerCount: number,
  oneCardHeightPx: number
): number {
  const layers = Math.max(1, layerCount);
  if (layers === 1) {
    return oneCardHeightPx + SWIMLANE_TASK_ROW_VERTICAL_INSET_PX * 2;
  }
  return resolveSwimlaneStackedTaskBandHeightPx(layers, oneCardHeightPx);
}

/** Значение для localStorage: null — убрать ручной запас, иначе число слоёв ≥ contentMin. */
export function normalizeSwimlaneStoredReservedTaskLayers(
  layers: number,
  contentMinTaskLayers: number
): number | null {
  if (layers <= contentMinTaskLayers) {
    return null;
  }
  return Math.min(MAX_SWIMLANE_RESERVED_TASK_LAYERS, layers);
}

export function readSwimlaneReservedTaskLayersForAssignee(
  storage: Readonly<Record<string, number>> | undefined,
  assigneeId: string
): number | undefined {
  const value = storage?.[assigneeId];
  if (value == null || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(1, Math.min(MAX_SWIMLANE_RESERVED_TASK_LAYERS, Math.round(value)));
}

/** Preview держим до синхронизации localStorage (и при росте, и при сжатии строки). */
export function resolveEffectiveSwimlaneReservedTaskLayersPreview(params: {
  contentMaxTaskLayers: number;
  preview: number | null;
  stored?: number;
}): number | null {
  if (params.preview == null) {
    return null;
  }
  if (params.stored === params.preview) {
    return null;
  }
  if (params.stored == null && params.preview <= params.contentMaxTaskLayers) {
    return null;
  }
  return params.preview;
}

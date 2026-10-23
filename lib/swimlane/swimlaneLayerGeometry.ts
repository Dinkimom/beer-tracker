/**
 * Вертикальная геометрия слоёв строки свимлейна в DOM (`[data-swimlane]`):
 * по ней drag переводит верхний край карточки в слой.
 */

interface SwimlaneLayerGeometry {
  /** Видимых слоёв в строке; дроп допускается на один слой ниже — строка вырастет. */
  layerCount: number;
  /** Верх слоя 0 от верха строки. */
  originPx: number;
  /** Шаг между слоями. */
  pitchPx: number;
}

export function swimlaneLayerGeometryDataAttributes(geometry: SwimlaneLayerGeometry): Record<string, string> {
  return {
    'data-swimlane-layer-count': String(geometry.layerCount),
    'data-swimlane-layer-origin': String(geometry.originPx),
    'data-swimlane-layer-pitch': String(geometry.pitchPx),
  };
}

export function readSwimlaneLayerGeometry(element: HTMLElement): SwimlaneLayerGeometry | null {
  const layerCount = Number(element.dataset.swimlaneLayerCount);
  const originPx = Number(element.dataset.swimlaneLayerOrigin);
  const pitchPx = Number(element.dataset.swimlaneLayerPitch);
  if (!Number.isFinite(layerCount) || !Number.isFinite(originPx) || !Number.isFinite(pitchPx) || pitchPx <= 0) {
    return null;
  }
  return { layerCount: Math.max(1, layerCount), originPx, pitchPx };
}

/**
 * Ряд под точкой карточки (`offsetPx` — от верха строки): `k` — верхняя половина ряда `k`,
 * `k + 0.5` — нижняя. Ниже последнего ряда — `layerCount` (новый ряд).
 */
export function swimlaneHoverLayerFromOffset(offsetPx: number, geometry: SwimlaneLayerGeometry): number {
  const position = (offsetPx - geometry.originPx) / geometry.pitchPx;
  if (position <= 0) {
    return 0;
  }
  const row = Math.floor(position);
  if (row >= geometry.layerCount) {
    return geometry.layerCount;
  }
  return position - row >= 0.5 ? row + 0.5 : row;
}

/** Ручной слой карточки в строке свимлейна (задача или заметка `comment:<id>`). */
export interface SwimlaneCardLayer {
  cardId: string;
  layer: number;
  /**
   * Время последней правки (мс). При конфликте слоя место остаётся за более старой записью,
   * уступает та карточка, которую двигали последней.
   */
  rev: number;
}

/** Правка слоя: `null` снимает ручной слой (карточка снова раскладывается сама). */
export interface SwimlaneCardLayerWrite {
  cardId: string;
  layer: number | null;
}

/** Слои 0..MAX-1; совпадает с CHECK в `swimlane_card_layers`. */
export const MAX_SWIMLANE_CARD_LAYER = 50;

export function clampSwimlaneCardLayer(layer: number): number {
  if (!Number.isFinite(layer)) {
    return 0;
  }
  return Math.max(0, Math.min(MAX_SWIMLANE_CARD_LAYER - 1, Math.round(layer)));
}

export function normalizeSwimlaneCardLayer(raw: unknown): SwimlaneCardLayer | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const row = raw as { cardId?: unknown; layer?: unknown; rev?: unknown };
  if (typeof row.cardId !== 'string' || row.cardId.length === 0) {
    return null;
  }
  if (typeof row.layer !== 'number' || !Number.isInteger(row.layer)) {
    return null;
  }
  return {
    cardId: row.cardId,
    layer: clampSwimlaneCardLayer(row.layer),
    rev: typeof row.rev === 'number' && Number.isFinite(row.rev) ? row.rev : 0,
  };
}

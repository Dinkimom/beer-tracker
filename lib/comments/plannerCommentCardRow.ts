/** Дефолтная длительность/высота новой заметки в частях таймлайна. */
export const DEFAULT_PLANNER_COMMENT_CARD_ROW_HEIGHT = 2;

export const MAX_PLANNER_COMMENT_CARD_ROW_HEIGHT = 10;

/** Верхняя граница «width = duration в частях» (иначе legacy px). */
const MAX_PLANNER_COMMENT_WIDTH_AS_DURATION_PARTS = 60;

export function plannerCommentDurationPartsFromWidth(width: number): number {
  if (!Number.isFinite(width) || width <= 0) {
    return DEFAULT_PLANNER_COMMENT_CARD_ROW_HEIGHT;
  }
  if (width <= MAX_PLANNER_COMMENT_WIDTH_AS_DURATION_PARTS) {
    return Math.max(1, Math.round(width));
  }
  return Math.max(1, Math.round(width / 100));
}

/** Вертикальный span (строки карточки) 1:1 с длительностью в частях таймлайна. */
export function plannerCommentCardRowHeightFromDurationParts(durationParts: number): number {
  const parts = Math.max(1, Math.round(durationParts));
  return Math.max(1, Math.min(MAX_PLANNER_COMMENT_CARD_ROW_HEIGHT, parts));
}

/** Строки карточки на свимлейне: схема 1:1 с шириной, остальные — сохранённый height (1..10). */
export function plannerCommentCardRowSpan(input: {
  height: number;
  kind: string;
  width: number;
}): number {
  if (input.kind === 'diagram') {
    return plannerCommentCardRowHeightFromDurationParts(
      plannerCommentDurationPartsFromWidth(input.width)
    );
  }
  if (!Number.isFinite(input.height) || input.height <= 0) {
    return 1;
  }
  return input.height <= MAX_PLANNER_COMMENT_CARD_ROW_HEIGHT ? Math.max(1, Math.round(input.height)) : 1;
}

export function plannerCommentCardRowHeightFromWidth(width: number): number {
  return plannerCommentCardRowHeightFromDurationParts(
    plannerCommentDurationPartsFromWidth(width)
  );
}

export function pairedPlannerCommentWidthAndCardRowHeight(durationParts: number): {
  height: number;
  width: number;
} {
  const width = Math.max(1, Math.round(durationParts));
  return {
    width,
    height: plannerCommentCardRowHeightFromDurationParts(width),
  };
}

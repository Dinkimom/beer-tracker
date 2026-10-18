/**
 * Наклон листа на доске.
 * Модуль = 3° × (короткая сторона / длинная) × спад от размера.
 * Маленький квадрат — полный угол. Дальше, даже при пропорции 1:1, угол
 * спадает: каждые 400px сверх 80px длинной стороны уменьшают его вдвое от остатка.
 * Карточка 10:1 почти ровная, чтобы длинный край не уезжал с ряда.
 * Знак стабилен для идентификатора: соседние листы могут смотреть в разные стороны.
 */
const STICKY_NOTE_TILT_SQUARE_DEG = 3;
const STICKY_NOTE_TILT_FULL_UP_TO_PX = 80;
const STICKY_NOTE_TILT_HALF_LIFE_PX = 400;

export function stickyNoteTiltSign(cardId: string): -1 | 1 {
  let hash = 0;
  for (const char of cardId) {
    hash = Math.imul(hash, 31) + char.charCodeAt(0);
  }
  return (hash & 1) === 0 ? -1 : 1;
}

/** 1 у маленького листа, дальше плавно к нулю. Не обнуляет угол. */
function stickyNoteSizeEase(longSide: number): number {
  const extra = longSide - STICKY_NOTE_TILT_FULL_UP_TO_PX;
  if (extra <= 0) return 1;
  return STICKY_NOTE_TILT_HALF_LIFE_PX / (STICKY_NOTE_TILT_HALF_LIFE_PX + extra);
}

export function resolveStickyNoteTiltDegrees(
  width: number,
  height: number,
  cardId: string
): number {
  if (width <= 0 || height <= 0 || cardId.length === 0) return 0;
  const longSide = Math.max(width, height);
  const squareness = Math.min(width, height) / longSide;
  const degrees =
    STICKY_NOTE_TILT_SQUARE_DEG * squareness * stickyNoteSizeEase(longSide) * stickyNoteTiltSign(cardId);
  return Math.round(degrees * 100) / 100;
}

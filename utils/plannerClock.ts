/**
 * Временно: подмена «сейчас» для проверки вёрстки текущего дня.
 * Вернуть `null` после просмотра.
 */
const PLANNER_CLOCK_OVERRIDE: Date | null = null;

/** Текущее время планера (с опциональной подменой для превью). */
export function getPlannerNow(): Date {
  if (PLANNER_CLOCK_OVERRIDE) {
    return new Date(PLANNER_CLOCK_OVERRIDE.getTime());
  }
  return new Date();
}

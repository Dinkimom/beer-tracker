/**
 * «Сейчас» для планера: день «сегодня», скролл к текущей колонке, fact-линия, burndown.
 * На `/demo/planner` подменяется на фиксированную дату спринта-фикстуры.
 */

let plannerNowOverrideMs: number | null = null;

/** Подмена часов планера (например демо: 16.10.2026). `null` — сброс. */
export function setPlannerNowOverride(value: Date | null): void {
  plannerNowOverrideMs = value == null ? null : value.getTime();
}

/** Текущее время планера (с опциональной подменой). */
export function getPlannerNow(): Date {
  if (plannerNowOverrideMs != null) {
    return new Date(plannerNowOverrideMs);
  }
  return new Date();
}

/** То же, что {@link getPlannerNow}, в миллисекундах. */
export function getPlannerNowMs(): number {
  return plannerNowOverrideMs ?? Date.now();
}

/** Граница дня заметнее линий частей дня (`DroppableCell`). z-index держит её поверх штриховки. */
const DAY_DIVIDER_CLASS = 'z-[2] bg-gray-300/80 dark:bg-gray-600';

/** 1px-разделитель справа от дня. Последний день без линии — её рисует рельс за спринтом. */
export function timelineDayDividerClass(dayIndex: number, dayCount: number): string | null {
  if (dayIndex >= dayCount - 1) return null;
  return DAY_DIVIDER_CLASS;
}

/** Лёгкая заливка колонки текущего дня — в шапке и под карточками свимлейна. */
export const TIMELINE_TODAY_COLUMN_TINT_CLASS =
  'pointer-events-none absolute inset-0 bg-blue-500/[0.06] dark:bg-blue-400/[0.07]';

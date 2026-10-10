/** Та же серая линия, что у обычных дней. z-index держит её поверх штриховки. */
const DAY_DIVIDER_CLASS = 'z-[2] bg-gray-200 dark:bg-gray-600';

/** 1px-разделитель справа от дня. Последний день без линии — её рисует рельс за спринтом. */
export function timelineDayDividerClass(dayIndex: number, dayCount: number): string | null {
  if (dayIndex >= dayCount - 1) return null;
  return DAY_DIVIDER_CLASS;
}

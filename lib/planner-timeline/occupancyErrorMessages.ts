/** Ключи причин ошибки для тултипа */
export const OCCUPANCY_ERROR_MESSAGES = {
  assignee_unavailable: 'Исполнитель в отпуске или техспринте',
  qa_before_dev: 'Занятость тестирования идёт раньше или пересекается с разработкой',
  qa_without_dev: 'Задача тестирования без запланированной задачи разработки',
  performer_overlap: 'Пересечение по занятости',
} as const;

export type OccupancyErrorReason = keyof typeof OCCUPANCY_ERROR_MESSAGES;

/** Собирает текст тултипа по списку причин */
export function formatOccupancyErrorTooltip(reasons: OccupancyErrorReason[] | undefined): string {
  if (!reasons?.length) return '';
  return reasons.map((r) => OCCUPANCY_ERROR_MESSAGES[r] ?? r).join(' • ');
}

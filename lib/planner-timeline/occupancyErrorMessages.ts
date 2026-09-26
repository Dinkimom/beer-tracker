import { translate } from '@/lib/i18n/translator';

/** Ключи причин ошибки и их пути в словаре переводов */
const OCCUPANCY_ERROR_REASONS = {
  assignee_unavailable: 'task.occupancyRisks.assigneeUnavailable',
  qa_before_dev: 'task.occupancyRisks.qaBeforeDev',
  qa_without_dev: 'task.occupancyRisks.qaWithoutDev',
  performer_overlap: 'task.occupancyRisks.performerOverlap',
} as const;

export type OccupancyErrorReason = keyof typeof OCCUPANCY_ERROR_REASONS;

type OccupancyErrorTranslate = (key: string) => string;

export function translateOccupancyErrorReason(
  reason: OccupancyErrorReason,
  t: OccupancyErrorTranslate
): string {
  return t(OCCUPANCY_ERROR_REASONS[reason]);
}

/**
 * Собирает текст тултипа по списку причин.
 * Без переводчика — русский словарь: так текст читает легаси occupancy.
 */
export function formatOccupancyErrorTooltip(
  reasons: OccupancyErrorReason[] | undefined,
  t?: OccupancyErrorTranslate
): string {
  if (!reasons?.length) return '';
  const label = t ?? ((key: string) => translate('ru', key));
  return reasons.map((reason) => translateOccupancyErrorReason(reason, label)).join(' • ');
}

import type { AppLanguage } from '@/lib/i18n/model';

import { parseSlaPriority } from './parseSlaBugFields';
import {
  daysBetween,
  hoursBetween,
  parseDateMs,
  resolveEffectiveSlaDeadlineFromFields,
} from './slaBugMetrics';

interface FormatSlaBugTooltipZbpSlaParams {
  createdAt?: string;
  language: AppLanguage;
  priority?: string;
  slaDeadline?: string;
  t: (key: string, params?: Record<string, string>) => string;
}

export function formatSlaBugTooltipZbpSla({
  createdAt,
  language: _language,
  priority,
  slaDeadline,
  t,
}: FormatSlaBugTooltipZbpSlaParams): string {
  const priorityLabel = priority?.trim() || t('sidebar.bugsTab.tooltip.noValue');
  const parsedPriority = parseSlaPriority(priority);
  const effectiveSlaDeadline =
    parsedPriority != null
      ? resolveEffectiveSlaDeadlineFromFields(parsedPriority, createdAt, slaDeadline)
      : slaDeadline?.trim() || undefined;
  const slaMs = parseDateMs(effectiveSlaDeadline);
  if (slaMs == null) {
    return t('sidebar.bugsTab.tooltip.zbpSlaNoDeadline', { priority: priorityLabel });
  }

  const nowMs = Date.now();
  const diffMs = slaMs - nowMs;
  if (diffMs < 0) {
    const overdueDays = Math.max(1, Math.ceil(daysBetween(slaMs, nowMs)));
    return t('sidebar.bugsTab.tooltip.zbpSlaOverdue', {
      days: String(overdueDays),
      priority: priorityLabel,
    });
  }

  const hoursToSla = hoursBetween(nowMs, slaMs);
  if (hoursToSla < 24) {
    const hours = Math.max(1, Math.ceil(hoursToSla));
    return t('sidebar.bugsTab.tooltip.zbpSlaHours', {
      hours: String(hours),
      priority: priorityLabel,
    });
  }

  const daysToSla = daysBetween(nowMs, slaMs);
  if (daysToSla < 14) {
    const days = Math.max(1, Math.ceil(daysToSla));
    return t('sidebar.bugsTab.tooltip.zbpSlaDays', {
      days: String(days),
      priority: priorityLabel,
    });
  }

  const weeks = Math.max(1, Math.ceil(daysToSla / 7));
  return t('sidebar.bugsTab.tooltip.zbpSlaWeeks', {
    priority: priorityLabel,
    weeks: String(weeks),
  });
}

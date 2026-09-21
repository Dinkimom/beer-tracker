'use client';

import type { AppLanguage } from '@/lib/i18n/model';
import type { SlaBugDemoteReason, SlaBugLabelKey } from '@/lib/slaBugs';

import { useState } from 'react';

import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { BUGS_TAB_TOOLTIP_SHELL_CLASS } from '@/features/sidebar/components/tabs/BugsTab/bugsTabTooltipShellClass';
import { SlaBugHdWeeklyHeatmap } from '@/features/task/components/TaskCard/components/SlaBugHdWeeklyHeatmap';
import { SlaBugSignalTagTooltipMetricCell } from '@/features/task/components/TaskCard/components/SlaBugSignalTagTooltipMetricCell';
import { getSlaBugSignalTagClasses, getSlaBugSignalTagHoverClasses } from '@/features/task/utils/slaBugSignalTagClasses';
import { formatSlaBugTooltipZbpSla } from '@/lib/slaBugs/formatSlaBugTooltipZbpSla';

const SLA_BUG_SIGNAL_TOOLTIP_SHELL_CLASS = `${BUGS_TAB_TOOLTIP_SHELL_CLASS} !w-[22rem] !max-w-[22rem] min-w-0`;

interface SlaBugSignalTagProps {
  createdAt?: string;
  demoteReason?: SlaBugDemoteReason;
  hdCount?: number;
  incidentSeverity?: string;
  issueKey: string;
  label: SlaBugLabelKey;
  lastHdAt?: string;
  slaDeadline?: string;
}

function formatLastHdAt(value: string | undefined, language: AppLanguage, noValue: string): string {
  if (!value?.trim()) {
    return noValue;
  }
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    return value.trim();
  }
  const locale = language === 'en' ? 'en-US' : 'ru-RU';
  return new Date(ms).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Лейбл сигнала SLA-бага: Radix-тултип с критерием + блокировка старта DnD с карточки.
 */
export function SlaBugSignalTag({
  createdAt,
  demoteReason,
  label,
  hdCount,
  incidentSeverity,
  issueKey,
  lastHdAt,
  slaDeadline,
}: SlaBugSignalTagProps) {
  const { language, t } = useI18n();
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const noValue = t('sidebar.bugsTab.tooltip.noValue');
  const description =
    label === 'demote' && demoteReason
      ? t(`sidebar.bugsTab.demoteReasons.${demoteReason}`)
      : t(`sidebar.bugsTab.tooltip.descriptions.${label}`);
  const totalHd = String(hdCount ?? 0);
  const lastHdIncrease = formatLastHdAt(lastHdAt, language, noValue);
  const signalName = t(`sidebar.bugsTab.tooltip.signals.${label}`);
  const zbpSla = formatSlaBugTooltipZbpSla({
    createdAt,
    language,
    priority: incidentSeverity,
    slaDeadline,
    t,
  });

  const content = (
    <div className="flex flex-col gap-3 text-left">
      <p className="text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100">
        {t(`sidebar.bugsTab.tooltip.titles.${label}`)}
      </p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-200 pt-3 dark:border-gray-600">
        <SlaBugSignalTagTooltipMetricCell
          label={t('sidebar.bugsTab.tooltip.hdTotal')}
          value={totalHd}
          valueClassName="text-base font-bold tabular-nums"
        />
        <SlaBugSignalTagTooltipMetricCell
          label={t('sidebar.bugsTab.tooltip.lastHdIncrease')}
          value={lastHdIncrease}
        />
        <SlaBugSignalTagTooltipMetricCell label={t('sidebar.bugsTab.tooltip.signal')} value={signalName} />
        <SlaBugSignalTagTooltipMetricCell label={t('sidebar.bugsTab.tooltip.zbpSla')} value={zbpSla} />
      </dl>

      <div className="w-full min-w-0 border-t border-gray-200 pt-3 dark:border-gray-600">
        <SlaBugHdWeeklyHeatmap
          createdAt={createdAt}
          enabled={tooltipOpen}
          hdCount={hdCount}
          issueKey={issueKey}
        />
      </div>

      <p className="border-t border-gray-200 pt-3 text-[11px] leading-relaxed text-gray-500 dark:border-gray-600 dark:text-gray-400">
        {description}
      </p>
    </div>
  );

  return (
    <TextTooltip
      content={content}
      contentClassName={SLA_BUG_SIGNAL_TOOLTIP_SHELL_CLASS}
      delayDuration={200}
      interactive
      side="top"
      sideOffset={10}
      onOpenChange={setTooltipOpen}
    >
      <span
        className={`pointer-events-auto inline-flex cursor-pointer items-center text-[10px] font-semibold leading-none whitespace-nowrap rounded px-1.5 py-0.5 shrink-0 border transition-colors duration-150 ease-out ${getSlaBugSignalTagClasses(label)} ${getSlaBugSignalTagHoverClasses(label)}`}
      >
        {t(`sidebar.bugsTab.labels.${label}`)}
      </span>
    </TextTooltip>
  );
}

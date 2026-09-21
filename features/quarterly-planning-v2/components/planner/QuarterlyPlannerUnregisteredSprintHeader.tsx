'use client';

import type { QuarterlySprintInfo } from '../../types';

import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import { resolveUnregisteredSprintNumber } from '@/features/quarterly-planning-v2/utils/quarterlyTimelineHeader';

interface QuarterlyPlannerUnregisteredSprintHeaderProps {
  sprintIndex: number;
  sprintInfos: QuarterlySprintInfo[];
}

/** Заголовок слота без спринта в трекере: номер + прочерк, по hover — пояснение. */
export function QuarterlyPlannerUnregisteredSprintHeader({
  sprintIndex,
  sprintInfos,
}: QuarterlyPlannerUnregisteredSprintHeaderProps) {
  const { t } = useI18n();
  const sprintNumber = resolveUnregisteredSprintNumber(sprintInfos, sprintIndex);

  return (
    <TextTooltip
      content={t('planning.quarterlyV2.sprintNotRegisteredHint')}
      delayDuration={120}
      side="bottom"
      singleInGroupId={`quarterly-sprint-unregistered-${sprintIndex}`}
    >
      <span
        aria-label={t('planning.quarterlyV2.sprintNotRegisteredAria', { sprint: sprintNumber })}
        className="inline-flex max-w-full cursor-default items-center justify-center gap-1 tabular-nums text-gray-500 dark:text-gray-400"
      >
        <span className="truncate">{sprintNumber}</span>
        <span aria-hidden className="shrink-0 text-gray-400 dark:text-gray-500">
          —
        </span>
      </span>
    </TextTooltip>
  );
}

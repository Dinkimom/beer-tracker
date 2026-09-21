'use client';

import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';

const SCORE_INFO_TOOLTIP_SHELL_CLASS =
  'max-w-[18rem] !rounded-lg !border !border-gray-300 !bg-white !px-3.5 !py-3 !text-sm !font-normal !leading-normal !text-gray-900 !shadow-none ring-1 ring-black/10 dark:!border-gray-600 dark:!bg-gray-800 dark:!text-gray-100 dark:ring-white/10 dark:!shadow-none';

/** Иконка «i» у лейбла Score с объяснением формулы. */
export function SprintScoreInfoButton() {
  const { t } = useI18n();

  return (
    <TextTooltip
      content={
        <div className="space-y-2 text-sm leading-snug">
          <p className="font-semibold">{t('sidebar.sprintScoreBlock.scoreInfoTitle')}</p>
          <p>{t('sidebar.sprintScoreBlock.scoreInfoGoals')}</p>
          <p>{t('sidebar.sprintScoreBlock.scoreInfoSp')}</p>
          <p>{t('sidebar.sprintScoreBlock.scoreInfoTp')}</p>
          <p className="text-gray-500 dark:text-gray-400">
            {t('sidebar.sprintScoreBlock.scoreInfoTotal')}
          </p>
        </div>
      }
      contentClassName={SCORE_INFO_TOOLTIP_SHELL_CLASS}
      delayDuration={200}
      side="bottom"
      sideOffset={8}
    >
      <button
        aria-label={t('sidebar.sprintScoreBlock.scoreInfoAria')}
        className="inline-flex shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 dark:text-gray-500 dark:hover:text-gray-300"
        type="button"
      >
        <Icon className="h-3.5 w-3.5" name="circle-info" />
      </button>
    </TextTooltip>
  );
}

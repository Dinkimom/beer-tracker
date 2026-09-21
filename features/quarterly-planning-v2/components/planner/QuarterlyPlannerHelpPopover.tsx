'use client';

import * as Popover from '@radix-ui/react-popover';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { OVERLAY_FLOATING_ANIMATION } from '@/components/overlayAnimationClasses';
import { useI18n } from '@/contexts/LanguageContext';

import { QUARTERLY_STORY_EVENT_CATALOG, QUARTERLY_STORY_EVENT_EMOJI_CLASS } from '../../utils/quarterlyStoryEventCatalog';

/** Справка по квартальному планеру: события и подсказки по интерфейсу. */
export function QuarterlyPlannerHelpPopover() {
  const { t } = useI18n();

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button
          aria-label={t('planning.quarterlyV2.helpButtonAria')}
          className="!h-8 shrink-0 !px-2.5 text-gray-600 dark:text-gray-400"
          title={t('planning.quarterlyV2.helpButtonTitle')}
          type="button"
          variant="outline"
        >
          <Icon className="h-4 w-4 shrink-0" name="circle-help" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          className={`z-[300] w-[min(100vw-2rem,22rem)] rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-600 dark:bg-gray-800 ${OVERLAY_FLOATING_ANIMATION}`}
          sideOffset={6}
        >
          <Popover.Arrow className="fill-white dark:fill-gray-800" />
          <h2 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('planning.quarterlyV2.helpTitle')}
          </h2>

          <p className="mb-4 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
            {t('planning.quarterlyV2.helpIntro')}
          </p>

          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('planning.quarterlyV2.storyEventLegendTitle')}
          </h3>
          <ul className="mb-4 space-y-2">
            {QUARTERLY_STORY_EVENT_CATALOG.map(({ kind, emoji }) => (
              <li key={kind} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                <span aria-hidden className={`mt-0.5 shrink-0 ${QUARTERLY_STORY_EVENT_EMOJI_CLASS}`}>
                  {emoji}
                </span>
                <span>{t(`planning.quarterlyV2.storyEvent.${kind}`)}</span>
              </li>
            ))}
          </ul>

          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('planning.quarterlyV2.helpUiTitle')}
          </h3>
          <ul className="list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
            <li>{t('planning.quarterlyV2.helpUiPlanFill')}</li>
            <li>{t('planning.quarterlyV2.helpUiCommentCorner')}</li>
            <li>{t('planning.quarterlyV2.helpUiAddEvent')}</li>
            <li>{t('planning.quarterlyV2.helpUiEditEvent')}</li>
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

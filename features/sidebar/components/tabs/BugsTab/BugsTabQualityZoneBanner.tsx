'use client';

import { Icon } from '@/components/Icon';
import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import {
  computeNeedToCloseForZone,
  getNextSlaBugQualityZone,
  SLA_BUG_NEED_TO_CLOSE_PRIORITIES,
  type SlaBugNeedToCloseCounts,
  type SlaBugQualityZone,
} from '@/lib/slaBugs/qualityZone';

import { BUGS_TAB_TOOLTIP_SHELL_CLASS } from './bugsTabTooltipShellClass';
import { NeedToCloseCard } from './NeedToCloseCard';

const ZONE_STYLES: Record<
  SlaBugQualityZone,
  { accent: string; label: string }
> = {
  green: {
    accent: 'border-l-green-500 dark:border-l-green-400',
    label: 'text-green-600 dark:text-green-400',
  },
  yellow: {
    accent: 'border-l-yellow-500 dark:border-l-yellow-400',
    label: 'text-yellow-500 dark:text-yellow-400',
  },
  red: {
    accent: 'border-l-red-500 dark:border-l-red-400',
    label: 'text-red-500 dark:text-red-400',
  },
};

function stopDragActivation(e: React.SyntheticEvent) {
  e.stopPropagation();
}

interface BugsTabQualityZoneBannerProps {
  needToClose: SlaBugNeedToCloseCounts;
  zone: SlaBugQualityZone;
}

export function BugsTabQualityZoneBanner({ needToClose, zone }: BugsTabQualityZoneBannerProps) {
  const { t } = useI18n();
  const styles = ZONE_STYLES[zone];
  const nextZone = getNextSlaBugQualityZone(zone);
  const needToCloseForNextZone =
    nextZone === 'green' || nextZone === 'yellow'
      ? computeNeedToCloseForZone(needToClose, nextZone)
      : null;

  return (
    <div
      className={`mb-4 flex items-start justify-between gap-4 rounded-lg border border-l-4 bg-gray-50/60 px-3 py-3 dark:bg-gray-900/35 ${styles.accent} border-gray-200 dark:border-gray-600`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            {t('sidebar.bugsTab.qualityZone.heading')}
          </p>
          <TextTooltip
            content={
              <p className="text-xs leading-snug text-gray-900 dark:text-gray-100">
                {t(`sidebar.bugsTab.qualityZone.zoneHints.${zone}`)}
              </p>
            }
            contentClassName={BUGS_TAB_TOOLTIP_SHELL_CLASS}
            delayDuration={200}
            side="bottom"
            sideOffset={8}
          >
            <button
              aria-label={t('sidebar.bugsTab.qualityZone.infoAria')}
              className="inline-flex shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 dark:text-gray-500 dark:hover:text-gray-300"
              type="button"
              onMouseDown={stopDragActivation}
              onPointerDown={stopDragActivation}
              onTouchStart={stopDragActivation}
            >
              <Icon className="h-3.5 w-3.5" name="circle-info" />
            </button>
          </TextTooltip>
        </div>
        <p className={`mt-0.5 text-2xl font-bold leading-tight ${styles.label}`}>
          {t(`sidebar.bugsTab.qualityZone.zones.${zone}`)}
        </p>
      </div>

      {nextZone ? (
        <div className="flex min-w-0 flex-col items-end gap-1.5">
          <p className="max-w-[11rem] text-right text-[11px] font-medium leading-snug text-gray-500 dark:text-gray-400">
            {t('sidebar.bugsTab.qualityZone.needToCloseForZone', {
              zone: t(`sidebar.bugsTab.qualityZone.zonesGenitive.${nextZone}`),
            })}
          </p>
          <div className="flex flex-wrap justify-end gap-1.5">
            {SLA_BUG_NEED_TO_CLOSE_PRIORITIES.map((priority) => (
              <NeedToCloseCard
                key={priority}
                count={needToCloseForNextZone?.[priority] ?? 0}
                priority={priority}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import type {
  OccupancyRowView,
  OccupancyTimelineSettings,
} from '@/hooks/useLocalStorage';

import { useMemo } from 'react';

import { CustomSelect } from '@/components/CustomSelect';
import { useI18n } from '@/contexts/LanguageContext';

import { CheckboxOption } from './CheckboxOption';
import { Toggle } from './Toggle';

interface OccupancySettingsSectionProps {
  extraRowSettings?: React.ReactNode;
  extraSettings?: React.ReactNode;
  rowView: OccupancyRowView;
  sectionId: string;
  showFactTimeline?: boolean;
  timelineSettings: OccupancyTimelineSettings;
  title: string;
  onRowViewChange: (next: OccupancyRowView) => void;
  onTimelineSettingsChange: (
    updater: (prev: OccupancyTimelineSettings) => OccupancyTimelineSettings
  ) => void;
}

export function OccupancySettingsSection({
  extraRowSettings,
  extraSettings,
  rowView,
  sectionId,
  showFactTimeline = true,
  timelineSettings,
  title,
  onRowViewChange,
  onTimelineSettingsChange,
}: OccupancySettingsSectionProps) {
  const { t } = useI18n();

  const rowViewOptions = useMemo(
    () =>
      [
        { label: t('settings.planningTab.sizingFull'), value: 'full' as const },
        { label: t('settings.planningTab.sizingCompact'), value: 'legacy' as const },
      ] satisfies { label: string; value: OccupancyRowView }[],
    [t]
  );

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('settings.occupancySection.rowViewLabel')}
          </span>
          <CustomSelect<OccupancyRowView>
            className="w-full"
            options={rowViewOptions}
            title={t('settings.occupancySection.rowViewTitle')}
            value={rowView}
            onChange={onRowViewChange}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('settings.occupancySection.rowViewHelp')}
          </p>
        </div>
        {extraRowSettings}
        {extraSettings}
      </div>

      {showFactTimeline && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {t('settings.occupancySection.factTimelineHeading')}
          </h4>
          <Toggle
            checked={timelineSettings.enabled}
            id={`${sectionId}-timeline-enabled`}
            label={t('settings.occupancySection.showTimeline')}
            onChange={(v) =>
              onTimelineSettingsChange((s) => ({ ...s, enabled: v }))
            }
          />
          {timelineSettings.enabled && (
            <div className="pl-1 space-y-1.5 border-l-2 border-gray-200 dark:border-gray-700 ml-0.5">
              <CheckboxOption
                checked={timelineSettings.showStatuses}
                label={t('settings.occupancySection.statuses')}
                onChange={(v) =>
                  onTimelineSettingsChange((s) => ({ ...s, showStatuses: v }))
                }
              />
              <CheckboxOption
                checked={timelineSettings.showComments}
                label={t('settings.occupancySection.comments')}
                onChange={(v) =>
                  onTimelineSettingsChange((s) => ({ ...s, showComments: v }))
                }
              />
              <CheckboxOption
                checked={timelineSettings.showReestimations}
                label={t('settings.occupancySection.reestimates')}
                onChange={(v) =>
                  onTimelineSettingsChange((s) => ({
                    ...s,
                    showReestimations: v,
                  }))
                }
              />
              <CheckboxOption
                checked={timelineSettings.showGitlab ?? true}
                label={t('settings.occupancySection.gitlab')}
                onChange={(v) =>
                  onTimelineSettingsChange((s) => ({
                    ...s,
                    showGitlab: v,
                  }))
                }
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

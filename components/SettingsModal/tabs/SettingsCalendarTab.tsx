'use client';

import { Toggle } from '@/components/SettingsModal/components/Toggle';
import { useI18n } from '@/contexts/LanguageContext';
import { DeveloperCalDavCredentialsForm } from '@/features/swimlane/components/DeveloperCalDavCredentialsForm';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface SettingsCalendarTabProps {
  swimlaneCalendarBusyVisible: boolean;
  setSwimlaneCalendarBusyVisible: (v: boolean) => void;
}

export function SettingsCalendarTab({
  setSwimlaneCalendarBusyVisible,
  swimlaneCalendarBusyVisible,
}: SettingsCalendarTabProps) {
  const { t } = useI18n();
  const { data: currentUser, isLoading, isError } = useCurrentUser();
  const developerId = currentUser
    ? String(currentUser.trackerUid ?? currentUser.uid)
    : '';

  return (
    <div className="space-y-6" role="tabpanel">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('settings.calendarTab.displaySection')}
        </h3>
        <Toggle
          checked={swimlaneCalendarBusyVisible}
          id="swimlane-calendar-busy"
          label={t('settings.calendarTab.swimlaneCalendarBusy')}
          onChange={setSwimlaneCalendarBusyVisible}
        />
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('settings.calendarTab.myCalendarHeading')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('settings.calendarTab.myCalendarHelp')}
          </p>
        </div>
        {isLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('settings.calendarTab.myCalendarLoading')}
          </p>
        ) : null}
        {isError || (!isLoading && !developerId) ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('settings.calendarTab.myCalendarUnavailable')}
          </p>
        ) : null}
        {developerId ? <DeveloperCalDavCredentialsForm developerId={developerId} /> : null}
      </section>
    </div>
  );
}

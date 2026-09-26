'use client';

import type { SidebarTabSettings } from '@/hooks/useLocalStorage';
import type { HolidayCountryCode } from '@/lib/holidays/holidayCountries';

import { LanguageSelector } from '@/components/LanguageSelector';
import { useI18n } from '@/contexts/LanguageContext';

import { HolidayCountrySelect } from '../components/HolidayCountrySelect';
import { PwaInstallSection } from '../components/PwaInstallSection';
import { SidebarTabsSettingsList } from '../components/SidebarTabsSettingsList';
import { Toggle } from '../components/Toggle';

interface SettingsGeneralTabComponentProps {
  holidayCountry: HolidayCountryCode;
  showHolidays: boolean;
  sidebarTabsSettings: SidebarTabSettings[];
  syncAssignees: boolean;
  syncEstimates: boolean;
  setHolidayCountry: (value: HolidayCountryCode) => void;
  setShowHolidays: (v: boolean) => void;
  setSidebarTabsSettings: (
    value: SidebarTabSettings[] | ((prev: SidebarTabSettings[]) => SidebarTabSettings[])
  ) => void;
  setSyncAssignees: (v: boolean) => void;
  setSyncEstimates: (v: boolean) => void;
}

export function SettingsGeneralTab({
  holidayCountry,
  syncAssignees,
  syncEstimates,
  setHolidayCountry,
  setSyncAssignees,
  setSyncEstimates,
  setSidebarTabsSettings,
  setShowHolidays,
  showHolidays,
  sidebarTabsSettings,
}: SettingsGeneralTabComponentProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-6" role="tabpanel">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('settings.generalTab.sections.display')}
        </h3>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {t('settings.generalTab.languageLabel')}
          </span>
          <LanguageSelector className="[&_button]:!border-0 [&_button]:!bg-gray-100/70 [&_button]:!text-gray-700 [&_button]:!shadow-none [&_button:hover]:!bg-gray-200/70 dark:[&_button]:!bg-gray-700/60 dark:[&_button]:!text-gray-100 dark:[&_button:hover]:!bg-gray-600/70" />
        </div>
        <Toggle
          checked={showHolidays}
          hint={t('settings.generalTab.holidaysHint')}
          id="show-holidays"
          label={t('settings.generalTab.holidaysLabel')}
          onChange={setShowHolidays}
        />
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('settings.generalTab.holidayCountryLabel')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-snug">
              {t('settings.generalTab.holidayCountryHint')}
            </p>
          </div>
          <HolidayCountrySelect value={holidayCountry} onChange={setHolidayCountry} />
        </div>
        <PwaInstallSection />
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('settings.generalTab.sections.sync')}
        </h3>
        <Toggle
          checked={syncEstimates}
          hint={t('settings.generalTab.syncEstimatesHint')}
          id="data-sync-estimates"
          label={t('settings.generalTab.syncEstimatesLabel')}
          onChange={setSyncEstimates}
        />
        <Toggle
          checked={syncAssignees}
          hint={t('settings.generalTab.syncAssigneesHint')}
          id="data-sync-assignees"
          label={t('settings.generalTab.syncAssigneesLabel')}
          onChange={setSyncAssignees}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t('settings.generalTab.sections.sidebarTabs')}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('settings.generalTab.sidebarTabsIntro')}
        </p>
        <SidebarTabsSettingsList
          setSidebarTabsSettings={setSidebarTabsSettings}
          sidebarTabsSettings={sidebarTabsSettings}
        />
      </section>
    </div>
  );
}

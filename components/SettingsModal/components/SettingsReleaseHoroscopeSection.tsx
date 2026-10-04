'use client';

import { useI18n } from '@/contexts/LanguageContext';
import {
  useReleaseHoroscopeBirthdateStorage,
  useReleaseHoroscopeEnabledStorage,
} from '@/hooks/useLocalStorage';
import { getWesternZodiacIdFromIsoBirthdate } from '@/lib/releaseHoroscope/zodiacFromBirthdate';

import { Toggle } from './Toggle';

const BIRTHDATE_INPUT_CLASS =
  'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100';

export function SettingsReleaseHoroscopeSection() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useReleaseHoroscopeEnabledStorage();
  const [birthdate, setBirthdate] = useReleaseHoroscopeBirthdateStorage();
  const signId = getWesternZodiacIdFromIsoBirthdate(birthdate);
  const needsBirthdate = enabled && signId == null;

  return (
    <>
      <Toggle
        checked={enabled}
        hint={t('settings.generalTab.releaseHoroscopeHint')}
        id="release-horoscope"
        label={t('settings.generalTab.releaseHoroscopeLabel')}
        onChange={setEnabled}
      />
      {enabled ? (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <label
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              htmlFor="release-horoscope-birthdate"
            >
              {t('settings.generalTab.releaseHoroscopeBirthdateLabel')}
            </label>
            {needsBirthdate ? (
              <p className="mt-1.5 text-xs leading-snug text-gray-500 dark:text-gray-400">
                {t('settings.generalTab.releaseHoroscopeBirthdateRequired')}
              </p>
            ) : null}
          </div>
          <input
            autoFocus={birthdate === ''}
            className={BIRTHDATE_INPUT_CLASS}
            id="release-horoscope-birthdate"
            type="date"
            value={birthdate}
            onChange={(event) => setBirthdate(event.target.value)}
          />
        </div>
      ) : null}
    </>
  );
}

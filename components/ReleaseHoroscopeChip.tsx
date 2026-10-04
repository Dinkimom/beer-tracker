'use client';

import type { ReleaseSignStatus } from '@/lib/releaseHoroscope/releaseHoroscopeDay';

import { useQuery } from '@tanstack/react-query';

import { TextTooltip } from '@/components/TextTooltip';
import { useI18n } from '@/contexts/LanguageContext';
import {
  useReleaseHoroscopeBirthdateStorage,
  useReleaseHoroscopeEnabledStorage,
} from '@/hooks/useLocalStorage';
import { fetchReleaseHoroscopeDay } from '@/lib/api/releaseHoroscope';
import { releaseHoroscopeSignName } from '@/lib/releaseHoroscope/releaseHoroscopeDay';
import { getWesternZodiacIdFromIsoBirthdate } from '@/lib/releaseHoroscope/zodiacFromBirthdate';

const VERDICT_CLASS: Record<ReleaseSignStatus, string> = {
  bad: 'text-rose-700 dark:text-rose-300',
  good: 'text-emerald-700 dark:text-emerald-300',
  neutral: 'text-amber-800 dark:text-amber-200',
};

const VERDICT_KEY: Record<ReleaseSignStatus, string> = {
  bad: 'header.releaseHoroscope.verdictBad',
  good: 'header.releaseHoroscope.verdictGood',
  neutral: 'header.releaseHoroscope.verdictNeutral',
};

/** Компактный гороскоп релиза в панели контролов планера. Полный текст — в тултипе. */
export function ReleaseHoroscopeChip() {
  const { language, t } = useI18n();
  const [enabled] = useReleaseHoroscopeEnabledStorage();
  const [birthdate] = useReleaseHoroscopeBirthdateStorage();
  const signId = enabled ? getWesternZodiacIdFromIsoBirthdate(birthdate) : null;
  const { data } = useQuery({
    queryKey: ['releaseHoroscope', 'day'],
    queryFn: fetchReleaseHoroscopeDay,
    enabled: signId !== null,
    retry: 1,
    staleTime: 60 * 60 * 1000,
  });

  const sign = signId ? data?.signs.find((item) => item.id === signId) : null;
  if (!sign) return null;

  const name = releaseHoroscopeSignName(sign, language);
  const verdict = t(VERDICT_KEY[sign.status]);

  return (
    <TextTooltip
      content={sign.comment}
      contentClassName="max-w-sm font-normal leading-snug"
      side="bottom"
    >
      <button
        aria-label={`${name}. ${verdict}. ${sign.comment}`}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-2.5 text-sm text-gray-800 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
        type="button"
      >
        <span aria-hidden className="leading-none">
          {sign.symbol}
        </span>
        <span>{name}</span>
        <span aria-hidden className="text-gray-400 dark:text-gray-500">
          ·
        </span>
        <span className={`font-medium ${VERDICT_CLASS[sign.status]}`}>{verdict}</span>
      </button>
    </TextTooltip>
  );
}

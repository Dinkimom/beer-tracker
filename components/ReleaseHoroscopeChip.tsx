'use client';

import type { ReleaseHoroscopeZodiacIconRef } from '@/components/releaseHoroscope/ReleaseHoroscopeZodiacIcon';
import type { ReleaseSignStatus } from '@/lib/releaseHoroscope/releaseHoroscopeDay';

import * as Popover from '@radix-ui/react-popover';
import { useQuery } from '@tanstack/react-query';
import { useRef } from 'react';

import { ReleaseHoroscopeZodiacIcon } from '@/components/releaseHoroscope/ReleaseHoroscopeZodiacIcon';
import { tooltipSurfaceClass } from '@/components/TextTooltipPortalContent';
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

const CHIP_CLASS =
  'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg bg-transparent px-2.5 text-sm text-gray-800 outline-none transition-all duration-200 hover:bg-black/5 active:scale-[0.98] active:bg-black/10 dark:text-gray-100 dark:hover:bg-white/10 dark:active:bg-white/15';

/** Компактный гороскоп релиза в панели контролов планера. Полный текст — по нажатию. */
export function ReleaseHoroscopeChip() {
  const iconRef = useRef<ReleaseHoroscopeZodiacIconRef>(null);
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
  if (!signId || !sign) return null;

  const name = releaseHoroscopeSignName(sign, language);
  const verdict = t(VERDICT_KEY[sign.status]);

  return (
    <Popover.Root modal={false}>
      <Popover.Trigger asChild>
        <button
          aria-label={`${name}. ${verdict}. ${sign.comment}`}
          className={CHIP_CLASS}
          type="button"
          onClick={() => iconRef.current?.play()}
        >
          <ReleaseHoroscopeZodiacIcon key={signId} ref={iconRef} signId={signId} />
          <span>{name}</span>
          <span aria-hidden className="text-gray-400 dark:text-gray-500">
            ·
          </span>
          <span className={`font-medium ${VERDICT_CLASS[sign.status]}`}>{verdict}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="center"
          className={tooltipSurfaceClass(true, 'max-w-sm font-normal leading-snug')}
          collisionPadding={8}
          side="bottom"
          sideOffset={6}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          {sign.comment}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

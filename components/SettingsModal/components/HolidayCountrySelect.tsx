'use client';

import { useMemo } from 'react';

import { CustomSelect } from '@/components/CustomSelect';
import { useI18n } from '@/contexts/LanguageContext';
import {
  HOLIDAY_COUNTRY_CODES,
  type HolidayCountryCode,
} from '@/lib/holidays/holidayCountries';

interface HolidayCountrySelectProps {
  value: HolidayCountryCode;
  onChange: (value: HolidayCountryCode) => void;
}

export function HolidayCountrySelect({ onChange, value }: HolidayCountrySelectProps) {
  const { language, t } = useI18n();
  const options = useMemo(() => {
    const region = new Intl.DisplayNames([language], { type: 'region' });
    return HOLIDAY_COUNTRY_CODES.map((code) => ({
      label: region.of(code.toUpperCase()) ?? code.toUpperCase(),
      value: code,
    })).sort((left, right) => left.label.localeCompare(right.label, language));
  }, [language]);

  return (
    <CustomSelect<HolidayCountryCode>
      className="w-52 shrink-0"
      menuFitContent
      menuMinWidth={208}
      options={options}
      searchEmptyMessage={t('settings.generalTab.holidayCountryEmpty')}
      searchPlaceholder={t('common.searchPlaceholder')}
      searchable
      size="compact"
      title={t('settings.generalTab.holidayCountryLabel')}
      value={value}
      onChange={onChange}
    />
  );
}

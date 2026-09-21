'use client';

import { CustomSelect } from '@/components/CustomSelect';
import { useI18n } from '@/contexts/LanguageContext';
import { AppLanguage, SUPPORTED_LANGUAGES } from '@/lib/i18n/model';

const labelByLanguage: Record<AppLanguage, string> = {
  en: 'header.languageNames.en',
  ru: 'header.languageNames.ru',
};

interface LanguageSelectorProps {
  className?: string;
}

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const { language, setLanguage, t } = useI18n();
  const options = SUPPORTED_LANGUAGES.map((item) => ({
    label: t(labelByLanguage[item]),
    value: item,
  }));

  return (
    <CustomSelect<AppLanguage>
      className={className ? `w-32 ${className}` : 'w-32'}
      options={options}
      size="compact"
      title="Language"
      value={language}
      onChange={setLanguage}
    />
  );
}

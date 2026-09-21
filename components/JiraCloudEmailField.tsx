'use client';

import { Input } from '@/components/Input';
import { useI18n } from '@/contexts/LanguageContext';

interface JiraCloudEmailFieldProps {
  hintClassName?: string;
  id: string;
  inputClassName?: string;
  invalid?: boolean;
  labelClassName?: string;
  required?: boolean;
  showHint?: boolean;
  value: string;
  onChange: (value: string) => void;
}

export function JiraCloudEmailField({
  hintClassName = 'mt-2 text-xs text-gray-500 dark:text-gray-400',
  id,
  inputClassName = 'mt-1',
  invalid = false,
  labelClassName = 'block text-sm font-medium text-gray-700 dark:text-gray-300',
  onChange,
  required = true,
  showHint = true,
  value,
}: JiraCloudEmailFieldProps) {
  const { t } = useI18n();
  return (
    <div>
      <label className={labelClassName} htmlFor={id}>
        {t('auth.setup.jiraCloudEmailLabel')}
        {required ? (
          <>
            {' '}
            <span className="text-red-500">*</span>
          </>
        ) : null}
      </label>
      <Input
        autoComplete="email"
        className={inputClassName}
        id={id}
        invalid={invalid}
        placeholder={t('auth.setup.jiraCloudEmailPlaceholder')}
        required={required}
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {showHint ? <p className={hintClassName}>{t('auth.setup.jiraCloudEmailHint')}</p> : null}
    </div>
  );
}

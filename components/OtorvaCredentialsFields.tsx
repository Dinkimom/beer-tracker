'use client';

import { useI18n } from '@/contexts/LanguageContext';

import { Input } from './Input';
import { PasswordInput } from './PasswordInput';

/** Имена полей формы: значения читает `readOtorvaCredentials` при отправке. */
const FIELD = {
  email: 'otorvaEmail',
  firstName: 'otorvaFirstName',
  lastName: 'otorvaLastName',
  secret: 'otorvaSecret',
} as const;

const LABEL_CLASS = 'block text-sm font-medium text-gray-700 dark:text-gray-300';

interface OtorvaCredentialsFieldsProps {
  disabled?: boolean;
  idPrefix: string;
  /** Онбординг: имя первого администратора встроенного трекера. */
  withName?: boolean;
}

/**
 * Email и пароль встроенного трекера (otorva). Поля неуправляемые: форма читает их при отправке
 * (`readOtorvaCredentials`), состояние не протаскивается через родителя.
 */
export function OtorvaCredentialsFields({ disabled = false, idPrefix, withName = false }: OtorvaCredentialsFieldsProps) {
  const { t } = useI18n();
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <div className="space-y-4">
      {withName ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLASS} htmlFor={id(FIELD.firstName)}>
              {t('auth.otorva.firstNameLabel')}
            </label>
            <Input autoComplete="given-name" className="mt-1" disabled={disabled} id={id(FIELD.firstName)} name={FIELD.firstName} required />
          </div>
          <div>
            <label className={LABEL_CLASS} htmlFor={id(FIELD.lastName)}>
              {t('auth.otorva.lastNameLabel')}
            </label>
            <Input autoComplete="family-name" className="mt-1" disabled={disabled} id={id(FIELD.lastName)} name={FIELD.lastName} />
          </div>
        </div>
      ) : null}
      <div>
        <label className={LABEL_CLASS} htmlFor={id(FIELD.email)}>
          {t('auth.otorva.emailLabel')}
        </label>
        <Input autoComplete="email" className="mt-1" disabled={disabled} id={id(FIELD.email)} name={FIELD.email} required type="email" />
      </div>
      <div>
        <label className={LABEL_CLASS} htmlFor={id(FIELD.secret)}>
          {t('auth.otorva.passwordLabel')}
        </label>
        <div className="mt-1">
          <PasswordInput
            autoComplete={withName ? 'new-password' : 'current-password'}
            disabled={disabled}
            id={id(FIELD.secret)}
            minLength={6}
            name={FIELD.secret}
            required
          />
        </div>
        {withName ? <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('auth.otorva.passwordHint')}</p> : null}
      </div>
    </div>
  );
}

/** Значения полей `OtorvaCredentialsFields` из отправленной формы. */
export function readOtorvaCredentials(form: HTMLFormElement): {
  email: string;
  firstName?: string;
  lastName?: string;
  password: string;
} {
  const data = new FormData(form);
  const text = (name: string) => String(data.get(name) ?? '').trim();
  return {
    email: text(FIELD.email),
    firstName: text(FIELD.firstName) || undefined,
    lastName: text(FIELD.lastName) || undefined,
    password: String(data.get(FIELD.secret) ?? ''),
  };
}

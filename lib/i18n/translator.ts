import { appMessages, AppMessages } from '@/lib/i18n/messages';
import { AppLanguage, DEFAULT_LANGUAGE, FALLBACK_LANGUAGE } from '@/lib/i18n/model';

const SECONDARY_FALLBACK_LANGUAGE: AppLanguage =
  FALLBACK_LANGUAGE === 'ru' ? 'en' : 'ru';

const MISSING_TRANSLATION_FALLBACK = 'Translation unavailable';

type TranslationParams = Record<string, number | string>;

function getNestedMessage(source: AppMessages, key: string): string | null {
  const segments = key.split('.');
  let current: unknown = source;

  for (const segment of segments) {
    if (!current || typeof current !== 'object') {
      return null;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === 'string' ? current : null;
}

function formatMessage(message: string, params?: TranslationParams): string {
  if (!params) return message;

  return message.replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = params[token];
    return value === undefined ? '' : String(value);
  });
}

function getTranslation(language: AppLanguage, key: string): string | null {
  return getNestedMessage(appMessages[language] as AppMessages, key);
}

export function hasTranslation(language: AppLanguage, key: string): boolean {
  return getTranslation(language, key) !== null;
}

export function translate(
  language: AppLanguage = DEFAULT_LANGUAGE,
  key: string,
  params?: TranslationParams
): string {
  const selected =
    getTranslation(language, key) ??
    getTranslation(FALLBACK_LANGUAGE, key) ??
    getTranslation(SECONDARY_FALLBACK_LANGUAGE, key);

  return formatMessage(selected ?? MISSING_TRANSLATION_FALLBACK, params);
}

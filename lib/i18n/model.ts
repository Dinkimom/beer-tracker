export const SUPPORTED_LANGUAGES = ['ru', 'en'] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = 'ru';

export const FALLBACK_LANGUAGE: AppLanguage = 'ru';

export function isAppLanguage(value: string): value is AppLanguage {
  return SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}

/**
 * localStorage language is unavailable during SSR. Until hydration finishes,
 * always render {@link DEFAULT_LANGUAGE} so the first client pass matches HTML.
 */
export function resolveLanguageForHydration(
  storedLanguage: AppLanguage,
  isHydrated: boolean
): AppLanguage {
  return isHydrated ? storedLanguage : DEFAULT_LANGUAGE;
}

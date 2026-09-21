'use client';

import type { ReactNode } from 'react';

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';

import { useIssueTrackerProviderKind } from '@/contexts/IssueTrackerProviderKindContext';
import { useAppLanguageStorage } from '@/hooks/useLocalStorage';
import { AppLanguage, resolveLanguageForHydration } from '@/lib/i18n/model';
import { hasTranslation, translate } from '@/lib/i18n/translator';
import { issueTrackerI18nParams } from '@/lib/issueTrackerProvider/issueTrackerUi';

type TranslationParams = Record<string, number | string>;

type LanguageSetter = (
  language:
    | AppLanguage
    | ((prev: AppLanguage) => AppLanguage)
) => void;

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: LanguageSetter;
  has: (key: string) => boolean;
  t: (key: string, params?: TranslationParams) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function subscribeHydration() {
  return () => {};
}

function getClientHydratedSnapshot() {
  return true;
}

function getServerHydratedSnapshot() {
  return false;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [storedLanguage, setLanguage] = useAppLanguageStorage();
  const isHydrated = useSyncExternalStore(
    subscribeHydration,
    getClientHydratedSnapshot,
    getServerHydratedSnapshot
  );
  const language = resolveLanguageForHydration(storedLanguage, isHydrated);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key, params) => translate(language, key, params),
      has: (key) => hasTranslation(language, key),
    }),
    [language, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

function useLanguageContext(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguageContext must be used inside LanguageProvider');
  }
  return context;
}

export function useI18n(): LanguageContextValue {
  const context = useLanguageContext();
  const kind = useIssueTrackerProviderKind();
  return useMemo(() => {
    const trackerParams = issueTrackerI18nParams((key) => translate(context.language, key), kind);
    return {
      language: context.language,
      setLanguage: context.setLanguage,
      has: context.has,
      t: (key, params) => translate(context.language, key, { ...trackerParams, ...params }),
    };
  }, [context, kind]);
}

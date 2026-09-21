import type { AppLanguage } from '@/lib/i18n/model';

import { enMessages } from './en';
import { ruMessages } from './ru';

interface TranslationDictionary {
  [key: string]: TranslationDictionary | string;
}

export const appMessages: Record<AppLanguage, TranslationDictionary> = {
  en: enMessages,
  ru: ruMessages,
};

export type AppMessages = typeof ruMessages;

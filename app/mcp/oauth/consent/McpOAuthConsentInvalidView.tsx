'use client';

import { AuthBackground, AuthCard } from '@/components/AuthScreenChrome';
import { useI18n } from '@/contexts/LanguageContext';

export function McpOAuthConsentInvalidView() {
  const { t } = useI18n();

  return (
    <AuthBackground>
      <AuthCard>
        <div className="space-y-2 text-center">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('mcpOAuth.consent.invalidTitle')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('mcpOAuth.consent.invalidBody')}
          </p>
        </div>
      </AuthCard>
    </AuthBackground>
  );
}

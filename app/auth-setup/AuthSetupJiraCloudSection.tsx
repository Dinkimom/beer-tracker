'use client';

import type { useI18n } from '@/contexts/LanguageContext';
import type { ReactNode } from 'react';

import { AtlassianOAuthConnectButton } from '@/components/AtlassianOAuthConnectButton';
import { Icon } from '@/components/Icon';
import { translateIssueTrackerProviderMessage } from '@/lib/issueTrackerProvider/issueTrackerUi';

type TranslateFn = ReturnType<typeof useI18n>['t'];

interface AuthSetupJiraCloudSectionProps {
  atlassianConnected: boolean;
  error: string;
  isLoading: boolean;
  t: TranslateFn;
}

export function AuthSetupJiraCloudSection({
  atlassianConnected,
  error,
  isLoading,
  t,
}: AuthSetupJiraCloudSectionProps): ReactNode {
  return (
    <div className="mt-6 space-y-3">
      <AtlassianOAuthConnectButton
        disabled={atlassianConnected || isLoading}
        returnPath="/auth-setup"
      />
      <p className="text-center text-xs leading-relaxed text-gray-500 dark:text-gray-400">
        {translateIssueTrackerProviderMessage(t, 'jira-cloud', 'auth.setup.infoMessage')}
      </p>
      {atlassianConnected ? (
        <p className="flex items-center justify-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
          {isLoading ? <Icon className="h-4 w-4 animate-spin" name="loader" /> : null}
          <span>{t('auth.setup.atlassianConnectedHint')}</span>
        </p>
      ) : null}
      {error ? (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/45 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}

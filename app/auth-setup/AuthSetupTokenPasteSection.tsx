'use client';

import type { useI18n } from '@/contexts/LanguageContext';
import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';
import type { ReactNode } from 'react';

import { authTextLinkClassName } from '@/components/AuthScreenChrome';
import { PasswordInput } from '@/components/PasswordInput';
import { translateIssueTrackerProviderMessage } from '@/lib/issueTrackerProvider/issueTrackerUi';

type TranslateFn = ReturnType<typeof useI18n>['t'];

interface AuthSetupTokenPasteSectionProps {
  error: string;
  issueTrackerProviderKind: IssueTrackerProviderKind;
  localToken: string;
  t: TranslateFn;
  tokenHelpUrl: string;
  onTokenChange: (value: string) => void;
  setError: (value: string) => void;
}

export function AuthSetupTokenPasteSection({
  error,
  issueTrackerProviderKind,
  localToken,
  onTokenChange,
  setError,
  t,
  tokenHelpUrl,
}: AuthSetupTokenPasteSectionProps): ReactNode {
  return (
    <div>
      <label
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        htmlFor="token"
      >
        {translateIssueTrackerProviderMessage(
          t,
          issueTrackerProviderKind,
          'auth.setup.tokenLabel'
        )}
      </label>
      <div className="mt-1">
        <PasswordInput
          autoComplete="off"
          autoFocus
          id="token"
          placeholder={translateIssueTrackerProviderMessage(
            t,
            issueTrackerProviderKind,
            'auth.setup.tokenPlaceholder'
          )}
          required
          value={localToken}
          onChange={(e) => {
            onTokenChange(e.target.value);
            setError('');
          }}
        />
      </div>
      {error ? (
        <div
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/45 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {t('auth.setup.getTokenPrefix')}{' '}
        <a
          className={authTextLinkClassName}
          href={tokenHelpUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {translateIssueTrackerProviderMessage(
            t,
            issueTrackerProviderKind,
            'auth.setup.oauthLink'
          )}
        </a>
      </p>
    </div>
  );
}

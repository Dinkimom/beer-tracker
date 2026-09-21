'use client';

import type { useI18n } from '@/contexts/LanguageContext';
import type { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';
import type { FormEvent, ReactNode } from 'react';

import Link from 'next/link';

import { Button } from '@/components/Button';
import { HeaderIconButton } from '@/components/HeaderIconButton';
import { Icon } from '@/components/Icon';
import { JiraCloudEmailField } from '@/components/JiraCloudEmailField';
import {
  useIssueTrackerProviderKind,
  useIssueTrackerTokenHelpUrl,
} from '@/contexts/IssueTrackerProviderKindContext';
import { translateIssueTrackerProviderMessage } from '@/lib/issueTrackerProvider/issueTrackerUi';

import { type OnPremGateState } from './authSetupPageHelpers';

type TranslateFn = ReturnType<typeof useI18n>['t'];
type ProductTenant = ReturnType<typeof useProductTenantOrganizations>;

interface AuthSetupCardInnerProps {
  error: string;
  isLoading: boolean;
  jiraEmail: string;
  localToken: string;
  premGate: OnPremGateState;
  productTenant: ProductTenant;
  requireJiraCloudEmail: boolean;
  showAuthSetupSpinner: boolean;
  showToken: boolean;
  t: TranslateFn;
  onJiraEmailChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onTokenChange: (value: string) => void;
  setError: (value: string) => void;
  setShowToken: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export function AuthSetupCardInner({
  error,
  isLoading,
  jiraEmail,
  localToken,
  premGate,
  onJiraEmailChange,
  onSubmit,
  onTokenChange,
  productTenant,
  requireJiraCloudEmail,
  setError,
  setShowToken,
  showAuthSetupSpinner,
  showToken,
  t,
}: AuthSetupCardInnerProps): ReactNode {
  const issueTrackerProviderKind = useIssueTrackerProviderKind();
  const tokenHelpUrl = useIssueTrackerTokenHelpUrl();
  if (showAuthSetupSpinner) {
    return (
      <div className="p-12 flex flex-col items-center gap-4">
        <Icon className="h-10 w-10 animate-spin text-amber-600" name="loader" />
        <p className="text-sm text-gray-600 dark:text-gray-300">{t('auth.setup.sessionLoading')}</p>
      </div>
    );
  }

  if (productTenant.signedIn && productTenant.organizations.length === 0) {
    return (
      <div className="p-8 text-center space-y-2">
        <p className="text-gray-700 dark:text-gray-200">
          {t('auth.setup.noOrganizationsDescription')}
        </p>
        <Link className="text-sm font-semibold text-amber-600 hover:underline" href="/register">
          {t('auth.setup.registerOrganizationAction')}
        </Link>
      </div>
    );
  }

  return (
    <>
      <form className="p-8 pt-6" onSubmit={onSubmit}>
        {premGate.loadError ? (
          <p className="mb-6 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
            <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" name="alert-circle" />
            <span>{t('auth.setup.setupLoadError')}</span>
          </p>
        ) : null}
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/25 border border-amber-200/80 dark:border-amber-700/50 rounded-xl">
          <div className="flex gap-3">
            <Icon
              className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
              name="info"
            />
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              {translateIssueTrackerProviderMessage(
                t,
                issueTrackerProviderKind,
                'auth.setup.infoMessage'
              )}
            </p>
          </div>
        </div>

        {requireJiraCloudEmail ? (
          <div className="mb-6">
            <JiraCloudEmailField
              id="jira-email"
              inputClassName="w-full"
              invalid={Boolean(error) && !jiraEmail.trim()}
              labelClassName="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
              value={jiraEmail}
              onChange={(value) => {
                onJiraEmailChange(value);
                setError('');
              }}
            />
          </div>
        ) : null}

        <div className="mb-6">
          <label
            className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            htmlFor="token"
          >
            {translateIssueTrackerProviderMessage(
              t,
              issueTrackerProviderKind,
              'auth.setup.tokenLabel'
            )}{' '}
            <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              autoComplete="off"
              autoFocus
              className={`w-full px-4 py-3 pr-11 text-sm border-2 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all ${
                error
                  ? 'border-red-400 dark:border-red-500'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
              id="token"
              placeholder={translateIssueTrackerProviderMessage(
                t,
                issueTrackerProviderKind,
                'auth.setup.tokenPlaceholder'
              )}
              required
              type={showToken ? 'text' : 'password'}
              value={localToken}
              onChange={(e) => {
                onTokenChange(e.target.value);
                setError('');
              }}
            />
            <HeaderIconButton
              aria-label={showToken ? t('auth.setup.hideToken') : t('auth.setup.showToken')}
              className="absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2 text-gray-500 hover:!bg-gray-200/50 dark:text-gray-400 dark:hover:!bg-gray-600/50"
              type="button"
              onClick={() => setShowToken((prev) => !prev)}
            >
              <Icon className="h-5 w-5" name={showToken ? 'eye-off' : 'eye'} />
            </HeaderIconButton>
          </div>
          {error ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
              <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" name="alert-circle" />
              <span>{error}</span>
            </p>
          ) : null}
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {t('auth.setup.getTokenPrefix')}{' '}
            <a
              className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline font-semibold transition-colors cursor-pointer"
              href={tokenHelpUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {translateIssueTrackerProviderMessage(
                t,
                issueTrackerProviderKind,
                'auth.setup.oauthLink'
              )}{' '}
              →
            </a>
          </p>
        </div>

        <Button
          className="w-full !rounded-xl !border-0 !bg-amber-500 py-3.5 !text-sm !font-semibold !shadow-lg !shadow-amber-500/25 hover:!bg-amber-600 active:scale-[0.98] disabled:!scale-100 disabled:!cursor-not-allowed disabled:!bg-gray-400 disabled:!shadow-none dark:!shadow-amber-500/10 dark:disabled:!bg-gray-500"
          disabled={
            !localToken.trim() ||
            (requireJiraCloudEmail && !jiraEmail.trim()) ||
            isLoading ||
            !(productTenant.activeOrganizationId ?? premGate.organizationId)
          }
          type="submit"
          variant="primary"
        >
          {isLoading ? (
            <>
              <Icon className="h-5 w-5 animate-spin" name="loader" />
              <span>{t('auth.setup.validatingToken')}</span>
            </>
          ) : (
            <>
              <Icon className="h-5 w-5" name="check" />
              <span>{t('auth.setup.continueAction')}</span>
            </>
          )}
        </Button>
      </form>
      {productTenant.signedIn ? (
        <div className="border-t border-gray-200/80 px-8 pb-8 pt-5 text-center dark:border-gray-600/80">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span>{t('auth.setup.adminLoginHint')}</span>
            <br />
            <Link
              className="font-semibold text-amber-600 hover:underline dark:text-amber-400"
              href="/admin"
            >
              {t('auth.setup.adminLoginLink')}
            </Link>
          </p>
        </div>
      ) : null}
    </>
  );
}

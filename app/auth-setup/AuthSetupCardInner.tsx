'use client';

import type { useI18n } from '@/contexts/LanguageContext';
import type { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';
import type { FormEvent, ReactNode } from 'react';

import Link from 'next/link';

import { authTextLinkClassName } from '@/components/AuthScreenChrome';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import {
  useIssueTrackerProviderKind,
  useIssueTrackerTokenHelpUrl,
} from '@/contexts/IssueTrackerProviderKindContext';
import { translateIssueTrackerProviderMessage } from '@/lib/issueTrackerProvider/issueTrackerUi';

import { AuthSetupBrandHeader } from './AuthSetupBrandHeader';
import { AuthSetupJiraCloudSection } from './AuthSetupJiraCloudSection';
import { type OnPremGateState } from './authSetupPageHelpers';
import { AuthSetupTokenPasteSection } from './AuthSetupTokenPasteSection';

type TranslateFn = ReturnType<typeof useI18n>['t'];
type ProductTenant = ReturnType<typeof useProductTenantOrganizations>;

interface AuthSetupCardInnerProps {
  atlassianConnected: boolean;
  error: string;
  isLoading: boolean;
  localToken: string;
  premGate: OnPremGateState;
  productTenant: ProductTenant;
  showAuthSetupSpinner: boolean;
  t: TranslateFn;
  onSubmit: (e: FormEvent) => void;
  onTokenChange: (value: string) => void;
  setError: (value: string) => void;
}

export function AuthSetupCardInner({
  atlassianConnected,
  error,
  isLoading,
  localToken,
  premGate,
  onSubmit,
  onTokenChange,
  productTenant,
  setError,
  showAuthSetupSpinner,
  t,
}: AuthSetupCardInnerProps): ReactNode {
  const issueTrackerProviderKind = useIssueTrackerProviderKind();
  const tokenHelpUrl = useIssueTrackerTokenHelpUrl();
  const isJiraCloud = issueTrackerProviderKind === 'jira-cloud';

  if (showAuthSetupSpinner) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-ds-text-muted">
        <Icon className="h-9 w-9 animate-spin text-blue-600 dark:text-blue-400" name="loader" />
        <p className="text-sm">{t('auth.setup.sessionLoading')}</p>
      </div>
    );
  }

  if (productTenant.signedIn && productTenant.organizations.length === 0) {
    return (
      <>
        <AuthSetupBrandHeader t={t} />
        <p className="mt-6 text-center text-sm text-gray-700 dark:text-gray-200">
          {t('auth.setup.noOrganizationsDescription')}
        </p>
        <p className="mt-4 text-center text-sm">
          <Link className={authTextLinkClassName} href="/register">
            {t('auth.setup.registerOrganizationAction')}
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <AuthSetupBrandHeader t={t} />
      {premGate.loadError ? (
        <div
          className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/45 dark:text-red-200"
          role="alert"
        >
          {t('auth.setup.setupLoadError')}
        </div>
      ) : null}
      {isJiraCloud ? (
        <AuthSetupJiraCloudSection
          atlassianConnected={atlassianConnected}
          error={error}
          isLoading={isLoading}
          t={t}
        />
      ) : (
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <AuthSetupTokenPasteSection
            error={error}
            issueTrackerProviderKind={issueTrackerProviderKind}
            localToken={localToken}
            setError={setError}
            t={t}
            tokenHelpUrl={tokenHelpUrl}
            onTokenChange={onTokenChange}
          />
          <Button
            className="w-full"
            disabled={
              !localToken.trim() ||
              isLoading ||
              !(productTenant.activeOrganizationId ?? premGate.organizationId)
            }
            type="submit"
            variant="primary"
          >
            {isLoading ? (
              <>
                <Icon className="h-4 w-4 animate-spin" name="loader" />
                <span>{t('auth.setup.validatingToken')}</span>
              </>
            ) : (
              t('auth.setup.continueAction')
            )}
          </Button>
          <p className="text-center text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {translateIssueTrackerProviderMessage(
              t,
              issueTrackerProviderKind,
              'auth.setup.infoMessage'
            )}
          </p>
        </form>
      )}
      {/* Jira Cloud: Connect / auto-login only — admin entry elsewhere. Hide while validating. */}
      {productTenant.signedIn && !isJiraCloud && !isLoading ? (
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          {t('auth.setup.adminLoginHint')}{' '}
          <Link className={authTextLinkClassName} href="/admin">
            {t('auth.setup.adminLoginLink')}
          </Link>
        </p>
      ) : null}
    </>
  );
}

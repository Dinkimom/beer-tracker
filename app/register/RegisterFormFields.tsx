'use client';

import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';

import {
  AuthBackground,
  AuthCard,
} from '@/components/AuthScreenChrome';
import { BeerLottie } from '@/components/BeerLottie';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { IssueTrackerConnectionFields } from '@/components/IssueTrackerConnectionFields';
import { PasswordInput } from '@/components/PasswordInput';
import { TrackerOAuthConnectButton } from '@/components/TrackerOAuthConnectButton';
import {
  useIssueTrackerProviderKind,
  useIssueTrackerTokenHelpUrl,
} from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { jiraCloudSiteHost } from '@/lib/atlassianOAuth/jiraCloudApiUrl';
import {
  issueTrackerRequiresExternalOrgId,
  translateIssueTrackerProviderMessage,
} from '@/lib/issueTrackerProvider/issueTrackerUi';

import { RegisterFormOrgNameField } from './RegisterFormOrgNameField';
import { RegisterFormSignInFooter } from './RegisterFormSignInFooter';

interface RegisterFormFieldsProps {
  atlassianConnected: boolean;
  /** Сайт Jira Cloud из OAuth (`https://acme.atlassian.net`). */
  atlassianSiteUrl: string;
  error: string;
  loading: boolean;
  /** Return path after Atlassian / Yandex ID OAuth (keeps typed form fields). */
  oauthReturnPath: string;
  onboardingMode: boolean;
  organizationName: string;
  signInHref: string;
  token: string;
  trackerApiBaseUrl: string;
  trackerOrgId: string;
  onOrganizationNameChange: (value: string) => void;
  onProviderKindChange: (value: IssueTrackerProviderKind) => void;
  onSubmit: (e: React.FormEvent) => void;
  onTokenChange: (value: string) => void;
  onTrackerApiBaseUrlChange: (value: string) => void;
  onTrackerOrgIdChange: (value: string) => void;
}

export function RegisterFormFields({
  atlassianConnected,
  atlassianSiteUrl,
  error,
  loading,
  oauthReturnPath,
  onboardingMode,
  organizationName,
  signInHref,
  token,
  trackerApiBaseUrl,
  trackerOrgId,
  onOrganizationNameChange,
  onProviderKindChange,
  onSubmit,
  onTokenChange,
  onTrackerApiBaseUrlChange,
  onTrackerOrgIdChange,
}: RegisterFormFieldsProps) {
  const { t } = useI18n();
  const issueTrackerProviderKind = useIssueTrackerProviderKind();
  const tokenHelpUrl = useIssueTrackerTokenHelpUrl();
  const isJiraCloud = issueTrackerProviderKind === 'jira-cloud';
  const isYandex = issueTrackerProviderKind === 'tracker';
  const showTrackerOrgId = issueTrackerRequiresExternalOrgId(issueTrackerProviderKind);
  const title = onboardingMode
    ? t('productAuth.register.onboardingTitle')
    : t('productAuth.register.title');
  const tagline = onboardingMode
    ? translateIssueTrackerProviderMessage(
        t,
        issueTrackerProviderKind,
        'productAuth.register.onboardingTagline'
      )
    : t('productAuth.register.tagline');
  const submitLabel = onboardingMode
    ? t('productAuth.register.onboardingSubmit')
    : t('productAuth.register.submit');

  return (
    <AuthBackground>
      <AuthCard>
        <div className="mb-6 flex justify-center">
          <BeerLottie size={88} />
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-100">
          {title}
        </h1>
        <p className="mt-2 text-center text-sm text-gray-700 dark:text-gray-300">{tagline}</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <RegisterFormOrgNameField
            onboardingMode={onboardingMode}
            organizationName={organizationName}
            onOrganizationNameChange={onOrganizationNameChange}
          />
          {onboardingMode ? (
            <IssueTrackerConnectionFields
              apiUrl={trackerApiBaseUrl}
              apiUrlHidden={isJiraCloud}
              disabled={loading}
              idPrefix="reg"
              kind={issueTrackerProviderKind}
              onApiUrlChange={onTrackerApiBaseUrlChange}
              onKindChange={onProviderKindChange}
            />
          ) : null}
          {showTrackerOrgId ? (
            <div>
              <label
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                htmlFor="reg-tracker-org-id"
              >
                {translateIssueTrackerProviderMessage(
                  t,
                  issueTrackerProviderKind,
                  'admin.trackerSection.orgIdLabel'
                )}
              </label>
              <Input
                className="mt-1"
                id="reg-tracker-org-id"
                placeholder={translateIssueTrackerProviderMessage(
                  t,
                  issueTrackerProviderKind,
                  'admin.trackerSection.orgPlaceholder'
                )}
                required
                type="text"
                value={trackerOrgId}
                onChange={(e) => onTrackerOrgIdChange(e.target.value)}
              />
            </div>
          ) : null}
          {isJiraCloud ? (
            <div className="space-y-2">
              {atlassianConnected ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  {t('productAuth.register.atlassianConnectedSite', {
                    site: jiraCloudSiteHost(atlassianSiteUrl),
                  })}
                </p>
              ) : (
                <TrackerOAuthConnectButton provider="jira-cloud" returnPath={oauthReturnPath} />
              )}
            </div>
          ) : null}
          {isYandex ? (
            token.trim() ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                {t('productAuth.register.yandexConnected')}
              </p>
            ) : (
              <TrackerOAuthConnectButton provider="tracker" returnPath={oauthReturnPath} />
            )
          ) : null}
          {isJiraCloud || isYandex ? null : (
            <div>
              <label
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                htmlFor="reg-tracker-token"
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
                  id="reg-tracker-token"
                  placeholder={translateIssueTrackerProviderMessage(
                    t,
                    issueTrackerProviderKind,
                    'auth.setup.tokenPlaceholder'
                  )}
                  required
                  value={token}
                  onChange={(e) => onTokenChange(e.target.value)}
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t('auth.setup.getTokenPrefix')}{' '}
                <a
                  className="font-semibold text-amber-600 hover:underline dark:text-amber-400"
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
          )}
          {error ? (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/45 dark:text-red-200"
              role="alert"
            >
              {error}
            </div>
          ) : null}
          <Button
            className="w-full"
            disabled={loading || ((isJiraCloud || isYandex) && !token.trim())}
            type="submit"
            variant="primary"
          >
            {loading ? t('productAuth.register.submitLoading') : submitLabel}
          </Button>
        </form>
        <RegisterFormSignInFooter onboardingMode={onboardingMode} signInHref={signInHref} t={t} />
      </AuthCard>
    </AuthBackground>
  );
}

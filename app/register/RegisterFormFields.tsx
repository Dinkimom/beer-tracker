'use client';

import {
  AuthBackground,
  AuthCard,
} from '@/components/AuthScreenChrome';
import { BeerLottie } from '@/components/BeerLottie';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { JiraCloudEmailField } from '@/components/JiraCloudEmailField';
import { PasswordInput } from '@/components/PasswordInput';
import {
  useIssueTrackerProviderKind,
  useIssueTrackerTokenHelpUrl,
  useJiraCloudRequiresBasicAuthEmail,
} from '@/contexts/IssueTrackerProviderKindContext';
import {
  issueTrackerRequiresExternalOrgId,
  translateIssueTrackerProviderMessage,
} from '@/lib/issueTrackerProvider/issueTrackerUi';

import { RegisterFormOrgNameField } from './RegisterFormOrgNameField';
import { RegisterFormSignInFooter } from './RegisterFormSignInFooter';

interface RegisterFormFieldsProps {
  error: string;
  jiraEmail: string;
  loading: boolean;
  onboardingMode: boolean;
  organizationName: string;
  signInHref: string;
  token: string;
  trackerOrgId: string;
  onJiraEmailChange: (value: string) => void;
  onOrganizationNameChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onTokenChange: (value: string) => void;
  onTrackerOrgIdChange: (value: string) => void;
  t: (key: string) => string;
}

export function RegisterFormFields({
  error,
  jiraEmail,
  loading,
  onboardingMode,
  organizationName,
  signInHref,
  t,
  token,
  trackerOrgId,
  onJiraEmailChange,
  onOrganizationNameChange,
  onSubmit,
  onTokenChange,
  onTrackerOrgIdChange,
}: RegisterFormFieldsProps) {
  const issueTrackerProviderKind = useIssueTrackerProviderKind();
  const tokenHelpUrl = useIssueTrackerTokenHelpUrl();
  const showJiraCloudEmail = useJiraCloudRequiresBasicAuthEmail();
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
          {showJiraCloudEmail ? (
            <JiraCloudEmailField
              id="reg-jira-email"
              value={jiraEmail}
              onChange={onJiraEmailChange}
            />
          ) : null}
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
          {error ? (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/45 dark:text-red-200"
              role="alert"
            >
              {error}
            </div>
          ) : null}
          <Button className="w-full" disabled={loading} type="submit" variant="primary">
            {loading ? t('productAuth.register.submitLoading') : submitLabel}
          </Button>
        </form>
        <RegisterFormSignInFooter onboardingMode={onboardingMode} signInHref={signInHref} t={t} />
      </AuthCard>
    </AuthBackground>
  );
}

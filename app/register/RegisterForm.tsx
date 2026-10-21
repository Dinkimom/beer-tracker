'use client';

import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { AuthPageLoadingFallback } from '@/components/AuthScreenChrome';
import { IssueTrackerProviderOverride } from '@/contexts/IssueTrackerProviderOverride';
import { useI18n } from '@/contexts/LanguageContext';
import { useTrackerTokenStorage } from '@/hooks/useLocalStorage';
import { useAtlassianOAuthClientTokenState } from '@/lib/atlassianOAuth/authSetupTokenState';
import { parseIssueTrackerProviderKind } from '@/lib/issueTrackerProvider/providerKind';
import { useYandexOAuthClientTokenState } from '@/lib/yandexOAuth/clientTokenState';

import { RegisterFormClosedView } from './RegisterFormClosedView';
import { RegisterFormFields } from './RegisterFormFields';
import { registerTrackerApiUrl, submitRegisterForm } from './registerFormSubmit';
import { useRegisterSetupState } from './useRegisterSetupState';

export function RegisterForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/admin';
  const { setupLoading, onPremMode, setupInitialized } = useRegisterSetupState();
  const [, setToken] = useTrackerTokenStorage();
  const oauthState = useAtlassianOAuthClientTokenState();
  const yandexOAuth = useYandexOAuthClientTokenState();

  const [providerKind, setProviderKind] = useState<IssueTrackerProviderKind>(
    () => parseIssueTrackerProviderKind(searchParams.get('tracker')) ?? 'tracker'
  );
  const [trackerApiBaseUrl, setTrackerApiBaseUrl] = useState(
    () => searchParams.get('trackerApi') ?? ''
  );
  const [token, setTokenField] = useState('');
  // Restored from the OAuth return path: the redirect to Atlassian / Yandex ID drops form state.
  const [trackerOrgId, setTrackerOrgId] = useState(() => searchParams.get('trackerOrgId') ?? '');
  const [organizationName, setOrganizationName] = useState(
    () => searchParams.get('orgName') ?? ''
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const cloudId = oauthState.cloudId;
  const refreshToken = oauthState.refreshToken;
  const expiresAt = oauthState.expiresAt;
  const atlassianConnected = oauthState.atlassianConnected;
  const oauthToken = providerKind === 'tracker' ? yandexOAuth.token : oauthState.token;
  const tokenForSubmit = (token.trim() || oauthToken).trim();
  const apiUrlForSubmit = registerTrackerApiUrl(providerKind, {
    atlassianSiteUrl: oauthState.siteUrl,
    typedApiUrl: trackerApiBaseUrl,
  });
  const displayError = error || oauthState.error || yandexOAuth.error;

  const onboardingMode = onPremMode && !setupInitialized;
  const signInHref = `/auth-setup?next=${encodeURIComponent(next)}`;
  const oauthReturnPath = `/register?${new URLSearchParams({
    next,
    orgName: organizationName.trim(),
    tracker: providerKind,
    trackerApi: trackerApiBaseUrl.trim(),
    trackerOrgId: trackerOrgId.trim(),
  }).toString()}`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (providerKind === 'jira-cloud' && (!cloudId.trim() || !apiUrlForSubmit)) {
      setError(t('productAuth.register.atlassianRequired'));
      return;
    }
    setLoading(true);
    const result = await submitRegisterForm({
      cloudId,
      expiresAt,
      onboardingMode,
      organizationName,
      provider: providerKind,
      refreshToken,
      t,
      token: tokenForSubmit,
      trackerApiBaseUrl: apiUrlForSubmit,
      trackerOrgId,
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setToken(tokenForSubmit, result.organizationId, {
      cloudId: cloudId || undefined,
      expiresAt,
      refreshToken: refreshToken || undefined,
    });
    router.push(next);
    router.refresh();
    setLoading(false);
  }

  if (setupLoading || !oauthState.oauthHydrated || !yandexOAuth.oauthHydrated) {
    return <AuthPageLoadingFallback />;
  }

  if (onPremMode && setupInitialized) {
    return <RegisterFormClosedView signInHref={signInHref} t={t} />;
  }

  return (
    <IssueTrackerProviderOverride apiUrl={apiUrlForSubmit} kind={providerKind}>
      <RegisterFormFields
        atlassianConnected={atlassianConnected}
        atlassianSiteUrl={oauthState.siteUrl}
        error={displayError}
        loading={loading}
        oauthReturnPath={oauthReturnPath}
        onboardingMode={onboardingMode}
        organizationName={organizationName}
        signInHref={signInHref}
        token={token || oauthToken}
        trackerApiBaseUrl={trackerApiBaseUrl}
        trackerOrgId={trackerOrgId}
        onOrganizationNameChange={setOrganizationName}
        onProviderKindChange={setProviderKind}
        onSubmit={onSubmit}
        onTokenChange={setTokenField}
        onTrackerApiBaseUrlChange={setTrackerApiBaseUrl}
        onTrackerOrgIdChange={setTrackerOrgId}
      />
    </IssueTrackerProviderOverride>
  );
}

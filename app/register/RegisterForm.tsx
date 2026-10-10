'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { AuthPageLoadingFallback } from '@/components/AuthScreenChrome';
import { useIssueTrackerProviderKind } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { useTrackerTokenStorage } from '@/hooks/useLocalStorage';
import { useAtlassianOAuthClientTokenState } from '@/lib/atlassianOAuth/authSetupTokenState';

import { RegisterFormClosedView } from './RegisterFormClosedView';
import { RegisterFormFields } from './RegisterFormFields';
import { submitRegisterForm } from './registerFormSubmit';
import { useRegisterSetupState } from './useRegisterSetupState';

export function RegisterForm() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/admin';
  const { setupLoading, onPremMode, setupInitialized } = useRegisterSetupState();
  const [, setToken] = useTrackerTokenStorage();
  const providerKind = useIssueTrackerProviderKind();
  const oauthState = useAtlassianOAuthClientTokenState();

  const [token, setTokenField] = useState('');
  const [trackerOrgId, setTrackerOrgId] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const cloudId = oauthState.cloudId;
  const refreshToken = oauthState.refreshToken;
  const expiresAt = oauthState.expiresAt;
  const atlassianConnected = oauthState.atlassianConnected;
  const tokenForSubmit = (token.trim() || oauthState.token).trim();
  const displayError = error || oauthState.error;

  const onboardingMode = onPremMode && !setupInitialized;
  const signInHref = `/auth-setup?next=${encodeURIComponent(next)}`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (providerKind === 'jira-cloud' && !cloudId.trim()) {
      setError(t('auth.setup.jiraCloudEmailRequired'));
      return;
    }
    setLoading(true);
    const result = await submitRegisterForm({
      cloudId,
      expiresAt,
      onboardingMode,
      organizationName,
      refreshToken,
      t,
      token: tokenForSubmit,
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

  if (setupLoading || !oauthState.oauthHydrated) {
    return <AuthPageLoadingFallback />;
  }

  if (onPremMode && setupInitialized) {
    return <RegisterFormClosedView signInHref={signInHref} t={t} />;
  }

  return (
    <RegisterFormFields
      atlassianConnected={atlassianConnected}
      error={displayError}
      loading={loading}
      onboardingMode={onboardingMode}
      organizationName={organizationName}
      signInHref={signInHref}
      t={t}
      token={token || oauthState.token}
      trackerOrgId={trackerOrgId}
      onOrganizationNameChange={setOrganizationName}
      onSubmit={onSubmit}
      onTokenChange={setTokenField}
      onTrackerOrgIdChange={setTrackerOrgId}
    />
  );
}

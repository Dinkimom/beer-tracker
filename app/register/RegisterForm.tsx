'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { AuthPageLoadingFallback } from '@/components/AuthScreenChrome';
import { useI18n } from '@/contexts/LanguageContext';
import { useTrackerTokenStorage } from '@/hooks/useLocalStorage';

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

  const [token, setTokenField] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [trackerOrgId, setTrackerOrgId] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onboardingMode = onPremMode && !setupInitialized;
  const signInHref = `/auth-setup?next=${encodeURIComponent(next)}`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await submitRegisterForm({
      jiraEmail,
      onboardingMode,
      organizationName,
      t,
      token,
      trackerOrgId,
    });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setToken(token, result.organizationId, jiraEmail);
    router.push(next);
    router.refresh();
    setLoading(false);
  }

  if (setupLoading) {
    return <AuthPageLoadingFallback />;
  }

  if (onPremMode && setupInitialized) {
    return <RegisterFormClosedView signInHref={signInHref} t={t} />;
  }

  return (
    <RegisterFormFields
      error={error}
      jiraEmail={jiraEmail}
      loading={loading}
      onboardingMode={onboardingMode}
      organizationName={organizationName}
      signInHref={signInHref}
      t={t}
      token={token}
      trackerOrgId={trackerOrgId}
      onJiraEmailChange={setJiraEmail}
      onOrganizationNameChange={setOrganizationName}
      onSubmit={onSubmit}
      onTokenChange={setTokenField}
      onTrackerOrgIdChange={setTrackerOrgId}
    />
  );
}

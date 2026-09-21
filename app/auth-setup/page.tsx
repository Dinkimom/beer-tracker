'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { BeerLottie } from '@/components/BeerLottie';
import { useJiraCloudRequiresBasicAuthEmail } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { useTrackerTokenStorage } from '@/hooks/useLocalStorage';
import {
  productSessionQueryKey,
  useProductTenantOrganizations,
} from '@/hooks/useProductTenantOrganizations';
import { postOnPremTrackerSession } from '@/lib/api/onprem';
import { readApiErrorMessage } from '@/lib/api/readApiError';
import { validateToken } from '@/lib/beerTrackerApi';

import { AuthSetupCardInner } from './AuthSetupCardInner';
import {
  loadOnPremGateState,
  resolveAuthSetupOrgId,
  shouldShowAuthSetupSpinner,
  type OnPremGateState,
} from './authSetupPageHelpers';

export default function AuthSetupPage() {
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, setToken] = useTrackerTokenStorage();
  const productTenant = useProductTenantOrganizations({ pollIntervalMs: 0 });

  const [localToken, setLocalToken] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [showToken, setShowToken] = useState(false);
  const requireJiraCloudEmail = useJiraCloudRequiresBasicAuthEmail();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [onPremGate, setOnPremGate] = useState<OnPremGateState>({
    loading: true,
    firstRun: false,
    loadError: false,
    organizationId: null,
  });

  useEffect(() => {
    let cancelled = false;
    loadOnPremGateState().then((state) => {
      if (!cancelled) setOnPremGate(state);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!onPremGate.loading && onPremGate.firstRun) {
      router.replace('/register?next=/admin');
    }
  }, [onPremGate.firstRun, onPremGate.loading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!localToken.trim()) {
      return;
    }
    if (requireJiraCloudEmail && !jiraEmail.trim()) {
      setError(t('auth.setup.jiraCloudEmailRequired'));
      return;
    }
    const orgIdForToken = resolveAuthSetupOrgId({
      activeOrganizationId: productTenant.activeOrganizationId,
      onPremGate,
    });
    if (!orgIdForToken) {
      setError(t('auth.setup.chooseOrganizationFirst'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await validateToken(localToken, {
        email: jiraEmail,
        organizationId: orgIdForToken,
      });

      if (!result.valid) {
        setError(result.error || t('auth.setup.invalidToken'));
        return;
      }

      if (onPremGate.organizationId) {
        try {
          await postOnPremTrackerSession({
            jiraEmail: jiraEmail.trim() || undefined,
            organizationId: orgIdForToken,
            token: localToken.trim(),
          });
        } catch (sessionError) {
          if (!productTenant.signedIn) {
            setError(readApiErrorMessage(sessionError, t('auth.setup.validationError')));
            return;
          }
        }
      }

      setToken(localToken.trim(), orgIdForToken, jiraEmail);
      await queryClient.invalidateQueries({ queryKey: productSessionQueryKey });
      router.replace('/');
    } catch (submitError) {
      console.error('Error validating token:', submitError);
      setError(t('auth.setup.validationError'));
    } finally {
      setIsLoading(false);
    }
  };

  const showAuthSetupSpinner = shouldShowAuthSetupSpinner({
    onPremGate,
    productTenantSessionLoading: productTenant.sessionLoading,
  });

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          'linear-gradient(165deg, #f0f9ff 0%, #e0f2fe 25%, #fefce8 50%, #fef3c7 75%, #fef9c3 100%)',
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 dark:block hidden pointer-events-none"
        style={{
          background:
            'linear-gradient(165deg, #0f172a 0%, #1e293b 30%, #1e3a5f 60%, #0f172a 100%)',
        }}
      />
      <div
        aria-hidden
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20 dark:opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full opacity-20 dark:opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)' }}
      />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center gap-3 mb-5">
            <div className="drop-shadow-md">
              <BeerLottie size={72} />
            </div>
            <h1
              className="font-bold text-gray-900 dark:text-gray-100 text-3xl md:text-4xl drop-shadow-sm"
              style={{
                fontFamily: 'var(--font-caveat), cursive',
                fontWeight: 700,
                letterSpacing: '0.02em',
                transform: 'rotate(-1deg)',
              }}
            >
              {t('auth.setup.appTitle')}
            </h1>
          </div>
          <p className="text-2xl md:text-2xl text-gray-700 dark:text-gray-200 mt-2">
            {t('auth.setup.welcome')}
          </p>
        </div>

        <div className="bg-white/90 dark:bg-gray-800/95 backdrop-blur-sm rounded-2xl shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-200/80 dark:border-gray-600/80 overflow-hidden">
          <AuthSetupCardInner
            error={error}
            isLoading={isLoading}
            jiraEmail={jiraEmail}
            localToken={localToken}
            premGate={onPremGate}
            productTenant={productTenant}
            requireJiraCloudEmail={requireJiraCloudEmail}
            setError={setError}
            setShowToken={setShowToken}
            showAuthSetupSpinner={showAuthSetupSpinner}
            showToken={showToken}
            t={t}
            onJiraEmailChange={setJiraEmail}
            onSubmit={handleSubmit}
            onTokenChange={setLocalToken}
          />
        </div>
      </div>
    </div>
  );
}

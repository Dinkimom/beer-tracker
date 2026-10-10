'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { AuthBackground, AuthCard } from '@/components/AuthScreenChrome';
import { useIssueTrackerProviderKind } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { useTrackerTokenStorage } from '@/hooks/useLocalStorage';
import {
  productSessionQueryKey,
  useProductTenantOrganizations,
} from '@/hooks/useProductTenantOrganizations';
import { postOnPremTrackerSession } from '@/lib/api/onprem';
import { readApiErrorMessage } from '@/lib/api/readApiError';
import { useAtlassianOAuthClientTokenState } from '@/lib/atlassianOAuth/authSetupTokenState';
import { sanitizeAtlassianOAuthReturnPath } from '@/lib/atlassianOAuth/oauthCookies';
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
  const searchParams = useSearchParams();
  const postAuthPath = sanitizeAtlassianOAuthReturnPath(searchParams.get('next'));
  const queryClient = useQueryClient();
  const [, setToken] = useTrackerTokenStorage();
  const productTenant = useProductTenantOrganizations({ pollIntervalMs: 0 });
  const providerKind = useIssueTrackerProviderKind();
  const oauthState = useAtlassianOAuthClientTokenState();

  const [localToken, setLocalToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [onPremGate, setOnPremGate] = useState<OnPremGateState>({
    loading: true,
    firstRun: false,
    loadError: false,
    organizationId: null,
  });
  const autoLoginStarted = useRef(false);

  const cloudId = oauthState.cloudId;
  const refreshToken = oauthState.refreshToken;
  const expiresAt = oauthState.expiresAt;
  const atlassianConnected = oauthState.atlassianConnected;
  const tokenForAuth = (localToken.trim() || oauthState.token).trim();
  const displayError = error || oauthState.error;

  const showAuthSetupSpinner = shouldShowAuthSetupSpinner({
    onPremGate,
    productTenantSessionLoading: productTenant.sessionLoading,
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

  useEffect(() => {
    if (!oauthState.oauthHydrated) {
      return;
    }
    if (providerKind !== 'jira-cloud' || !atlassianConnected) {
      return;
    }
    if (autoLoginStarted.current || isLoading || showAuthSetupSpinner) {
      return;
    }
    if (onPremGate.loading || onPremGate.firstRun) {
      return;
    }
    const orgId = resolveAuthSetupOrgId({
      activeOrganizationId: productTenant.activeOrganizationId,
      onPremGate,
    });
    if (!orgId || !tokenForAuth || !cloudId.trim()) {
      return;
    }
    autoLoginStarted.current = true;

    const run = async () => {
      setIsLoading(true);
      setError('');
      try {
        const result = await validateToken(tokenForAuth, {
          cloudId,
          organizationId: orgId,
        });
        if (!result.valid) {
          setError(result.error || t('auth.setup.invalidToken'));
          return;
        }
        if (onPremGate.organizationId) {
          try {
            await postOnPremTrackerSession({
              cloudId: cloudId || undefined,
              organizationId: orgId,
              token: tokenForAuth,
            });
          } catch (sessionError) {
            if (!productTenant.signedIn) {
              setError(readApiErrorMessage(sessionError, t('auth.setup.validationError')));
              return;
            }
          }
        }
        setToken(tokenForAuth, orgId, {
          cloudId,
          expiresAt,
          refreshToken: refreshToken || undefined,
        });
        await queryClient.invalidateQueries({ queryKey: productSessionQueryKey });
        router.replace(postAuthPath === '/auth-setup' ? '/' : postAuthPath);
      } catch (submitError) {
        console.error('Error validating token:', submitError);
        setError(t('auth.setup.validationError'));
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, [
    atlassianConnected,
    cloudId,
    expiresAt,
    isLoading,
    oauthState.oauthHydrated,
    onPremGate,
    postAuthPath,
    productTenant.activeOrganizationId,
    productTenant.signedIn,
    providerKind,
    queryClient,
    refreshToken,
    router,
    setToken,
    showAuthSetupSpinner,
    t,
    tokenForAuth,
  ]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!tokenForAuth) {
      return;
    }
    if (providerKind === 'jira-cloud' && !cloudId.trim()) {
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
      const result = await validateToken(tokenForAuth, {
        cloudId: cloudId || undefined,
        organizationId: orgIdForToken,
      });

      if (!result.valid) {
        setError(result.error || t('auth.setup.invalidToken'));
        return;
      }

      if (onPremGate.organizationId) {
        try {
          await postOnPremTrackerSession({
            cloudId: cloudId || undefined,
            organizationId: orgIdForToken,
            token: tokenForAuth,
          });
        } catch (sessionError) {
          if (!productTenant.signedIn) {
            setError(readApiErrorMessage(sessionError, t('auth.setup.validationError')));
            return;
          }
        }
      }

      setToken(tokenForAuth, orgIdForToken, {
        cloudId: cloudId || undefined,
        expiresAt,
        refreshToken: refreshToken || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: productSessionQueryKey });
      router.replace(postAuthPath === '/auth-setup' ? '/' : postAuthPath);
    } catch (submitError) {
      console.error('Error validating token:', submitError);
      setError(t('auth.setup.validationError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthBackground>
      <AuthCard>
        <AuthSetupCardInner
          atlassianConnected={atlassianConnected}
          error={displayError}
          isLoading={isLoading}
          localToken={localToken || oauthState.token}
          premGate={onPremGate}
          productTenant={productTenant}
          setError={setError}
          showAuthSetupSpinner={showAuthSetupSpinner || !oauthState.oauthHydrated}
          t={t}
          onSubmit={handleSubmit}
          onTokenChange={setLocalToken}
        />
      </AuthCard>
    </AuthBackground>
  );
}

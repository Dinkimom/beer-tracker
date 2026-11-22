'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { AuthBackground, AuthCard } from '@/components/AuthScreenChrome';
import { readOtorvaCredentials } from '@/components/OtorvaCredentialsFields';
import { useIssueTrackerProviderKind } from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { useTrackerTokenStorage } from '@/hooks/useLocalStorage';
import {
  productSessionQueryKey,
  useProductTenantOrganizations,
} from '@/hooks/useProductTenantOrganizations';
import { postOtorvaSession } from '@/lib/api/auth';
import { postOnPremTrackerSession } from '@/lib/api/onprem';
import { readApiErrorMessage } from '@/lib/api/readApiError';
import { useAtlassianOAuthClientTokenState } from '@/lib/atlassianOAuth/authSetupTokenState';
import { sanitizeAtlassianOAuthReturnPath } from '@/lib/atlassianOAuth/oauthCookies';
import { validateToken } from '@/lib/beerTrackerApi';
import { useYandexOAuthClientTokenState } from '@/lib/yandexOAuth/clientTokenState';

import { AuthSetupCardInner } from './AuthSetupCardInner';
import {
  loadOnPremGateState,
  resolveAuthSetupOrgId,
  shouldShowAuthSetupSpinner,
  type OnPremGateState,
} from './authSetupPageHelpers';

/** Встроенный трекер: email и пароль из формы → JWT otorva; при ошибке — текст в форму и `null`. */
async function signInToOtorva(
  form: HTMLFormElement,
  fallbackError: string,
  setError: (message: string) => void
): Promise<string | null> {
  try {
    const { email, password } = readOtorvaCredentials(form);
    return (await postOtorvaSession({ email, mode: 'login', password })).token;
  } catch (exchangeError) {
    setError(readApiErrorMessage(exchangeError, fallbackError));
    return null;
  }
}

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
  const yandexOAuth = useYandexOAuthClientTokenState();

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
  const oauthConnected =
    providerKind === 'jira-cloud'
      ? oauthState.atlassianConnected
      : providerKind === 'tracker' && yandexOAuth.token !== '';
  const oauthHydrated = oauthState.oauthHydrated && yandexOAuth.oauthHydrated;
  const tokenForAuth = (localToken.trim() || oauthState.token || yandexOAuth.token).trim();
  const displayError = error || oauthState.error || yandexOAuth.error;

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
    if (!oauthHydrated || !oauthConnected) {
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
    if (!orgId || !tokenForAuth || (providerKind === 'jira-cloud' && !cloudId.trim())) {
      return;
    }
    autoLoginStarted.current = true;

    const run = async () => {
      setIsLoading(true);
      setError('');
      try {
        const result = await validateToken(tokenForAuth, {
          cloudId: cloudId || undefined,
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
    cloudId,
    expiresAt,
    isLoading,
    oauthConnected,
    oauthHydrated,
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
    const isOtorva = providerKind === 'otorva';
    const form = e.currentTarget as HTMLFormElement;

    // Пустой токен отсекает `if (!token)` ниже; кнопка без токена (кроме встроенного трекера) и так неактивна.
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
      // Встроенный трекер: email и пароль → JWT otorva, дальше — тот же путь, что у вставленного токена.
      const token = isOtorva ? await signInToOtorva(form, t('auth.setup.validationError'), setError) : tokenForAuth;
      if (!token) {
        return;
      }
      const result = await validateToken(token, {
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
            token,
          });
        } catch (sessionError) {
          if (!productTenant.signedIn) {
            setError(readApiErrorMessage(sessionError, t('auth.setup.validationError')));
            return;
          }
        }
      }

      setToken(token, orgIdForToken, {
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
          error={displayError}
          isLoading={isLoading}
          localToken={localToken || oauthState.token}
          oauthConnected={oauthConnected}
          premGate={onPremGate}
          productTenant={productTenant}
          setError={setError}
          showAuthSetupSpinner={showAuthSetupSpinner || !oauthHydrated}
          t={t}
          onSubmit={handleSubmit}
          onTokenChange={setLocalToken}
        />
      </AuthCard>
    </AuthBackground>
  );
}

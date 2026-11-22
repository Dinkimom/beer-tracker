'use client';

import { OtorvaCredentialsFields } from '@/components/OtorvaCredentialsFields';
import { PasswordInput } from '@/components/PasswordInput';
import { TrackerOAuthConnectButton } from '@/components/TrackerOAuthConnectButton';
import {
  useIssueTrackerProviderKind,
  useIssueTrackerTokenHelpUrl,
} from '@/contexts/IssueTrackerProviderKindContext';
import { useI18n } from '@/contexts/LanguageContext';
import { jiraCloudSiteHost } from '@/lib/atlassianOAuth/jiraCloudApiUrl';
import { translateIssueTrackerProviderMessage } from '@/lib/issueTrackerProvider/issueTrackerUi';

interface RegisterTrackerCredentialsProps {
  atlassianConnected: boolean;
  atlassianSiteUrl: string;
  loading: boolean;
  oauthReturnPath: string;
  token: string;
  onTokenChange: (value: string) => void;
}

/**
 * Как первый администратор входит в выбранный трекер: Atlassian / Яндекс ID (OAuth), email и пароль
 * встроенного трекера или персональный токен Jira Server / Data Center.
 */
export function RegisterTrackerCredentials({
  atlassianConnected,
  atlassianSiteUrl,
  loading,
  oauthReturnPath,
  token,
  onTokenChange,
}: RegisterTrackerCredentialsProps) {
  const { t } = useI18n();
  const issueTrackerProviderKind = useIssueTrackerProviderKind();
  const tokenHelpUrl = useIssueTrackerTokenHelpUrl();
  const isJiraCloud = issueTrackerProviderKind === 'jira-cloud';
  const isYandex = issueTrackerProviderKind === 'tracker';
  const isOtorva = issueTrackerProviderKind === 'otorva';
  return (
    <>
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
      {isOtorva ? <OtorvaCredentialsFields disabled={loading} idPrefix="reg" withName /> : null}
      {issueTrackerProviderKind === 'jira-onprem' ? (
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
      ) : null}
    </>
  );
}

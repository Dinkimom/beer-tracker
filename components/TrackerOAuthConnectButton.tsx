'use client';

import { AtlassianLogoIcon } from '@/components/AtlassianLogoIcon';
import { YandexLogoIcon } from '@/components/YandexLogoIcon';
import { useI18n } from '@/contexts/LanguageContext';
import { JIRA_CLOUD_OAUTH_START_PATH } from '@/lib/issueTrackerProvider/issueTrackerUi';
import { YANDEX_OAUTH_START_PATH } from '@/lib/yandexOAuth/constants';

/** Провайдеры с входом пользователя через OAuth-редирект. */
export type TrackerOAuthProviderKind = 'jira-cloud' | 'tracker';

interface TrackerOAuthConnectButtonProps {
  className?: string;
  disabled?: boolean;
  provider: TrackerOAuthProviderKind;
  /** Path to return to after OAuth (must start with `/`). */
  returnPath: string;
}

/** Как `Button` secondary — единый вид на auth/register/settings. */
const buttonClassName =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-900 dark:bg-gray-700 dark:text-white';

export function TrackerOAuthConnectButton({
  className = '',
  disabled = false,
  provider,
  returnPath,
}: TrackerOAuthConnectButtonProps) {
  const { t } = useI18n();
  const isYandex = provider === 'tracker';
  const startPath = isYandex ? YANDEX_OAUTH_START_PATH : JIRA_CLOUD_OAUTH_START_PATH;
  const href = `${startPath}?return=${encodeURIComponent(returnPath)}`;
  const label = (
    <>
      {isYandex ? (
        <YandexLogoIcon className="h-5 w-5 shrink-0" />
      ) : (
        <AtlassianLogoIcon className="h-5 w-5 shrink-0" />
      )}
      <span>
        {isYandex ? t('auth.setup.yandexConnectButton') : t('auth.setup.atlassianConnectButton')}
      </span>
    </>
  );
  if (disabled) {
    return (
      <span className={`${buttonClassName} cursor-not-allowed opacity-50 ${className}`}>{label}</span>
    );
  }
  return (
    <a
      className={`${buttonClassName} cursor-pointer transition-all duration-200 hover:bg-gray-300 active:scale-[0.98] active:bg-gray-400 dark:hover:bg-gray-600 dark:active:bg-gray-500 ${className}`}
      href={href}
    >
      {label}
    </a>
  );
}

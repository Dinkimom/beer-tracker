'use client';

import { AtlassianLogoIcon } from '@/components/AtlassianLogoIcon';
import { useI18n } from '@/contexts/LanguageContext';

interface AtlassianOAuthConnectButtonProps {
  className?: string;
  disabled?: boolean;
  /** Path to return to after OAuth (must start with `/`). */
  returnPath: string;
}

/** Как `Button` secondary — единый вид на auth/register/admin. */
const buttonClassName =
  'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-900 dark:bg-gray-700 dark:text-white';

export function AtlassianOAuthConnectButton({
  className = '',
  disabled = false,
  returnPath,
}: AtlassianOAuthConnectButtonProps) {
  const { t } = useI18n();
  const href = `/api/auth/atlassian/start?return=${encodeURIComponent(returnPath)}`;
  const label = (
    <>
      <AtlassianLogoIcon className="h-5 w-5 shrink-0" />
      <span>{t('auth.setup.atlassianConnectButton')}</span>
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

'use client';

import Link from 'next/link';

import { authTextLinkClassName } from '@/components/AuthScreenChrome';

interface RegisterFormSignInFooterProps {
  onboardingMode: boolean;
  signInHref: string;
  t: (key: string) => string;
}

export function RegisterFormSignInFooter({
  onboardingMode,
  signInHref,
  t,
}: RegisterFormSignInFooterProps) {
  if (onboardingMode) {
    return null;
  }

  return (
    <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
      {t('productAuth.register.footerPrompt')}{' '}
      <Link className={authTextLinkClassName} href={signInHref}>
        {t('productAuth.register.signInLink')}
      </Link>
    </p>
  );
}

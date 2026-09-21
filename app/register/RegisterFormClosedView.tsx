'use client';

import Link from 'next/link';

import {
  AuthBackground,
  AuthCard,
  authTextLinkClassName,
} from '@/components/AuthScreenChrome';
import { BeerLottie } from '@/components/BeerLottie';

interface RegisterFormClosedViewProps {
  signInHref: string;
  t: (key: string) => string;
}

export function RegisterFormClosedView({ signInHref, t }: RegisterFormClosedViewProps) {
  return (
    <AuthBackground>
      <AuthCard>
        <div className="mb-6 flex justify-center">
          <BeerLottie size={88} />
        </div>
        <h1 className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-100">
          {t('productAuth.register.closedTitle')}
        </h1>
        <p className="mt-3 text-center text-sm text-gray-700 dark:text-gray-300">
          {t('productAuth.register.closedDescription')}
        </p>
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          {t('productAuth.register.closedSignInPrompt')}{' '}
          <Link className={authTextLinkClassName} href={signInHref}>
            {t('productAuth.register.signInLink')}
          </Link>
        </p>
      </AuthCard>
    </AuthBackground>
  );
}

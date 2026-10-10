'use client';

import type { useI18n } from '@/contexts/LanguageContext';
import type { ReactNode } from 'react';

import { BeerLottie } from '@/components/BeerLottie';

type TranslateFn = ReturnType<typeof useI18n>['t'];

interface AuthSetupBrandHeaderProps {
  t: TranslateFn;
}

export function AuthSetupBrandHeader({ t }: AuthSetupBrandHeaderProps): ReactNode {
  return (
    <>
      <div className="mb-6 flex justify-center">
        <BeerLottie size={88} />
      </div>
      <h1 className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl dark:text-gray-100">
        {t('auth.setup.welcome')}
      </h1>
    </>
  );
}

'use client';

import { Suspense } from 'react';

import { AuthPageLoadingFallback } from '@/components/AuthScreenChrome';

import { RegisterForm } from './RegisterForm';

export default function RegisterPage() {
  return (
    <Suspense fallback={<AuthPageLoadingFallback />}>
      <RegisterForm />
    </Suspense>
  );
}

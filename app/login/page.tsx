import { redirect } from 'next/navigation';

import { readOnPremSetupState } from '@/lib/onPrem/setupState';

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

function resolveSignInNextPath(raw: string | undefined): string {
  const next = raw?.trim() || '/admin';
  if (!next.startsWith('/') || next.startsWith('//')) {
    return '/admin';
  }
  return next;
}

/**
 * Парольный вход убран: /login только направляет на онбординг или вход по токену.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = resolveSignInNextPath(params.next);
  const suffix = `?next=${encodeURIComponent(next)}`;

  let initialized = true;
  try {
    const setup = await readOnPremSetupState();
    initialized = setup.initialized;
  } catch {
    /* БД недоступна — на форму токена, как на обычный вход. */
  }

  if (!initialized) {
    redirect(`/register${suffix}`);
  }

  redirect(`/auth-setup${suffix}`);
}

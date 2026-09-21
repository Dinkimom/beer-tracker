import type { Metadata } from 'next';

import { DEFAULT_LANGUAGE } from '@/lib/i18n/model';
import { translate } from '@/lib/i18n/translator';

export const metadata: Metadata = {
  title: translate(DEFAULT_LANGUAGE, 'auth.setup.title'),
};

export default function AuthSetupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

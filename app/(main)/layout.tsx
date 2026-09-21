'use client';

import { MobxRootProvider } from '@/lib/layers';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <MobxRootProvider>{children}</MobxRootProvider>;
}

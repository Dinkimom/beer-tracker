'use client';

import type { ReactNode } from 'react';

import { MobxRootProvider } from '@/lib/layers';

export default function DemoLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <MobxRootProvider>{children}</MobxRootProvider>;
}

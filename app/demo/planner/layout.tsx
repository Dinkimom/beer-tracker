'use client';

import type { ReactNode } from 'react';

import { DemoPlannerShellProvider } from '@/contexts/DemoPlannerShellContext';
import { DemoPlannerBoardsQueryScopeProvider } from '@/features/board/demoPlannerBoardsQueryScope';

export default function DemoPlannerLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <DemoPlannerShellProvider>
      <DemoPlannerBoardsQueryScopeProvider>{children}</DemoPlannerBoardsQueryScopeProvider>
    </DemoPlannerShellProvider>
  );
}

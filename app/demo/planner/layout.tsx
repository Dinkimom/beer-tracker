'use client';

import type { ReactNode } from 'react';

import { DemoPlannerShellProvider } from '@/contexts/DemoPlannerShellContext';
import { ObjectStorageConfiguredProvider } from '@/contexts/ObjectStorageConfiguredContext';
import { DemoPlannerBoardsQueryScopeProvider } from '@/features/board/demoPlannerBoardsQueryScope';

/** Фото и схемы в демо живут в стейте вкладки (blob/local), S3 не нужен. */
export default function DemoPlannerLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <DemoPlannerShellProvider>
      <ObjectStorageConfiguredProvider configured>
        <DemoPlannerBoardsQueryScopeProvider>{children}</DemoPlannerBoardsQueryScopeProvider>
      </ObjectStorageConfiguredProvider>
    </DemoPlannerShellProvider>
  );
}

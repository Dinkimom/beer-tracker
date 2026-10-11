'use client';

import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';
import type { ReactNode } from 'react';

import { useMemo } from 'react';

import {
  IssueTrackerProviderKindContext,
  issueTrackerProviderUiValue,
} from './IssueTrackerProviderKindContext';

/** Подменяет трекер для поддерева: формы, где трекер выбирают до сохранения. */
export function IssueTrackerProviderOverride({
  apiUrl,
  children,
  kind,
}: {
  apiUrl?: string;
  children: ReactNode;
  kind: IssueTrackerProviderKind;
}) {
  const value = useMemo(
    () => issueTrackerProviderUiValue(kind, apiUrl?.trim() || undefined),
    [apiUrl, kind]
  );
  return (
    <IssueTrackerProviderKindContext.Provider value={value}>
      {children}
    </IssueTrackerProviderKindContext.Provider>
  );
}

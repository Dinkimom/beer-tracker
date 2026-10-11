'use client';

import type { IssueTrackerProviderCapabilities, TrackerWebUrlContext } from '@/lib/issueTrackerProvider/issueTrackerUi';
import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';
import type { ReactNode } from 'react';

import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, useMemo } from 'react';

import { useProductTenantOrganizations } from '@/hooks/useProductTenantOrganizations';
import { fetchOnPremDefaultOrganization } from '@/lib/api/onprem';
import {
  issueTrackerIssueWebUrlFromBase,
  issueTrackerProviderCapabilities,
  issueTrackerTokenHelpUrl,
  issueTrackerWebBaseFromApiUrl,
} from '@/lib/issueTrackerProvider/issueTrackerUi';

const DEFAULT_KIND: IssueTrackerProviderKind = 'tracker';

interface IssueTrackerProviderUiValue {
  issueWebBaseUrl: string;
  kind: IssueTrackerProviderKind;
  tokenHelpUrl: string;
}

export function issueTrackerProviderUiValue(
  kind: IssueTrackerProviderKind,
  apiUrl?: string
): IssueTrackerProviderUiValue {
  return {
    issueWebBaseUrl: issueTrackerWebBaseFromApiUrl(kind, apiUrl),
    kind,
    tokenHelpUrl: issueTrackerTokenHelpUrl(kind, apiUrl),
  };
}

export const IssueTrackerProviderKindContext = createContext<IssueTrackerProviderUiValue>(
  issueTrackerProviderUiValue(DEFAULT_KIND)
);

/** Трекер активной организации; до входа — трекер организации по умолчанию. */
export function IssueTrackerProviderKindProvider({ children }: { children: ReactNode }) {
  const { activeOrganization, sessionLoading, signedIn } = useProductTenantOrganizations({
    pollIntervalMs: 0,
  });
  const { data: defaultOrganization } = useQuery({
    enabled: !sessionLoading && !signedIn,
    queryFn: fetchOnPremDefaultOrganization,
    queryKey: ['onprem', 'default-organization'],
    retry: false,
    staleTime: 60_000,
  });
  const tracker = signedIn ? activeOrganization?.issueTracker : defaultOrganization?.issueTracker;
  const value = useMemo(
    () =>
      tracker
        ? {
            issueWebBaseUrl: tracker.webBaseUrl,
            kind: tracker.kind,
            tokenHelpUrl: issueTrackerTokenHelpUrl(tracker.kind, tracker.apiUrl),
          }
        : issueTrackerProviderUiValue(DEFAULT_KIND),
    [tracker]
  );
  return (
    <IssueTrackerProviderKindContext.Provider value={value}>
      {children}
    </IssueTrackerProviderKindContext.Provider>
  );
}

export function useIssueTrackerProviderKind(): IssueTrackerProviderKind {
  return useContext(IssueTrackerProviderKindContext).kind;
}

export function useIssueTrackerProviderCapabilities(): IssueTrackerProviderCapabilities {
  return issueTrackerProviderCapabilities(useIssueTrackerProviderKind());
}

export function useIssueTrackerTokenHelpUrl(): string {
  return useContext(IssueTrackerProviderKindContext).tokenHelpUrl;
}

export function useTrackerWebUrlContext(): TrackerWebUrlContext {
  const { issueWebBaseUrl, kind } = useContext(IssueTrackerProviderKindContext);
  return useMemo(
    () => ({ kind, webBaseUrl: issueWebBaseUrl }),
    [issueWebBaseUrl, kind]
  );
}

export function useIssueTrackerIssueWebUrl(issueKey: string): string {
  const { issueWebBaseUrl, kind } = useContext(IssueTrackerProviderKindContext);
  return issueTrackerIssueWebUrlFromBase(kind, issueWebBaseUrl, issueKey);
}

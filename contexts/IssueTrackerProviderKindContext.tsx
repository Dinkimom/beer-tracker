'use client';

import type { IssueTrackerProviderCapabilities, TrackerWebUrlContext } from '@/lib/issueTrackerProvider/issueTrackerUi';
import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';
import type { ReactNode } from 'react';

import { createContext, useContext, useMemo } from 'react';

import {
  issueTrackerIssueWebUrlFromBase,
  issueTrackerProviderCapabilities,
  issueTrackerTokenHelpUrl,
  issueTrackerWebBaseFromApiUrl,
} from '@/lib/issueTrackerProvider/issueTrackerUi';
import { jiraCloudRequiresBasicAuthEmail } from '@/lib/issueTrackerProvider/jiraBasicAuthEmail';

const DEFAULT_KIND: IssueTrackerProviderKind = 'tracker';
const DEFAULT_ISSUE_WEB_BASE_URL = issueTrackerWebBaseFromApiUrl(DEFAULT_KIND);

interface IssueTrackerProviderUiValue {
  issueWebBaseUrl: string;
  kind: IssueTrackerProviderKind;
  tokenHelpUrl: string;
}

const IssueTrackerProviderKindContext = createContext<IssueTrackerProviderUiValue>({
  issueWebBaseUrl: DEFAULT_ISSUE_WEB_BASE_URL,
  kind: DEFAULT_KIND,
  tokenHelpUrl: issueTrackerTokenHelpUrl(DEFAULT_KIND),
});

export function IssueTrackerProviderKindProvider({
  children,
  issueWebBaseUrl,
  kind,
  tokenHelpUrl,
}: {
  children: ReactNode;
  issueWebBaseUrl: string;
  kind: IssueTrackerProviderKind;
  tokenHelpUrl: string;
}) {
  const value = useMemo(
    () => ({ issueWebBaseUrl, kind, tokenHelpUrl }),
    [issueWebBaseUrl, kind, tokenHelpUrl]
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

export function useJiraCloudRequiresBasicAuthEmail(): boolean {
  return jiraCloudRequiresBasicAuthEmail(useContext(IssueTrackerProviderKindContext).kind);
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

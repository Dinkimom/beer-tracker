import type {
  IssueTrackerCreateIssueLinkInput,
  IssueTrackerIssueLink,
  IssueTrackerProviderClient,
} from '@/lib/issueTrackerProvider/types';

import {
  deleteIssueLinkByTrackerId,
  issueLinkRowToDto,
  listIssueLinksForIssue,
  replaceIssueLinksForIssue,
  upsertIssueLink,
} from './issueLinksRepository';

/**
 * Refresh from Tracker and replace cache. On Tracker failure — return stale cache
 * (empty array if none). Does not throw for Tracker read errors.
 */
export async function loadIssueLinksWithCacheRefresh(input: {
  issueKey: string;
  issueTracker: Pick<IssueTrackerProviderClient, 'listIssueLinks'>;
  organizationId: string;
}): Promise<{ fromCache: boolean; links: IssueTrackerIssueLink[] }> {
  try {
    const fresh = await input.issueTracker.listIssueLinks(input.issueKey);
    const rows = await replaceIssueLinksForIssue({
      organizationId: input.organizationId,
      issueKey: input.issueKey,
      links: fresh,
    });
    return { fromCache: false, links: rows.map(issueLinkRowToDto) };
  } catch (error) {
    console.error(`Failed to refresh issue links for ${input.issueKey}:`, error);
    const rows = await listIssueLinksForIssue({
      organizationId: input.organizationId,
      issueKey: input.issueKey,
    });
    return { fromCache: true, links: rows.map(issueLinkRowToDto) };
  }
}

export async function createIssueLinkWriteThrough(input: {
  issueKey: string;
  issueTracker: Pick<IssueTrackerProviderClient, 'createIssueLink'>;
  organizationId: string;
  payload: IssueTrackerCreateIssueLinkInput;
}): Promise<IssueTrackerIssueLink> {
  const created = await input.issueTracker.createIssueLink(input.issueKey, input.payload);
  const row = await upsertIssueLink({
    organizationId: input.organizationId,
    issueKey: input.issueKey,
    link: created,
  });
  return row ? issueLinkRowToDto(row) : created;
}

export async function deleteIssueLinkWriteThrough(input: {
  issueKey: string;
  issueTracker: Pick<IssueTrackerProviderClient, 'deleteIssueLink'>;
  organizationId: string;
  trackerLinkId: string;
}): Promise<void> {
  await input.issueTracker.deleteIssueLink(input.issueKey, input.trackerLinkId);
  await deleteIssueLinkByTrackerId({
    organizationId: input.organizationId,
    issueKey: input.issueKey,
    trackerLinkId: input.trackerLinkId,
  });
}

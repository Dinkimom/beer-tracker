import type {
  IssueLinkCreateRelationship,
  IssueTrackerCreateIssueLinkInput,
  IssueTrackerIssueLink,
} from './issueLinkTypes';
import type { AxiosInstance } from 'axios';

import { mapTrackerRelationshipLabelToCanonical } from './issueLinkTypes';

interface JiraIssueLinkType {
  inward?: string;
  name?: string;
  outward?: string;
}

interface JiraLinkedIssue {
  fields?: {
    status?: { name?: string };
    summary?: string;
  };
  key?: string;
}

interface JiraIssueLinkPayload {
  id?: string;
  inwardIssue?: JiraLinkedIssue;
  outwardIssue?: JiraLinkedIssue;
  type?: JiraIssueLinkType;
}

const JIRA_LINK_TYPE_NAME: Record<IssueLinkCreateRelationship, string> = {
  relates: 'Relates',
  blocks: 'Blocks',
  blocked_by: 'Blocks',
  duplicates: 'Duplicate',
};

function mapJiraIssueLink(
  issueKey: string,
  payload: JiraIssueLinkPayload
): IssueTrackerIssueLink | null {
  const id = payload.id?.trim() ?? '';
  if (!id) {
    return null;
  }

  const outwardKey = payload.outwardIssue?.key?.trim() ?? '';
  const inwardKey = payload.inwardIssue?.key?.trim() ?? '';
  const type = payload.type;

  let linkedIssue: JiraLinkedIssue | undefined;
  let label: string | undefined;
  let direction: IssueTrackerIssueLink['direction'];

  if (outwardKey && outwardKey !== issueKey) {
    linkedIssue = payload.outwardIssue;
    label = type?.outward || type?.name || 'relates';
    direction = 'outward';
  } else if (inwardKey && inwardKey !== issueKey) {
    linkedIssue = payload.inwardIssue;
    label = type?.inward || type?.name || 'relates';
    direction = 'inward';
  } else {
    return null;
  }

  const linkedIssueKey = linkedIssue?.key?.trim() ?? '';
  if (!linkedIssueKey) {
    return null;
  }

  const relationship = mapTrackerRelationshipLabelToCanonical(label ?? '');
  if (!relationship) {
    return null;
  }

  return {
    id,
    direction,
    relationship,
    linkedIssueKey,
    linkedSummary: linkedIssue?.fields?.summary?.trim() || null,
    linkedStatus: linkedIssue?.fields?.status?.name?.trim() || null,
  };
}

export async function listJiraIssueLinks(
  api: AxiosInstance,
  issueKey: string
): Promise<IssueTrackerIssueLink[]> {
  const { data } = await api.get<{ fields?: { issuelinks?: JiraIssueLinkPayload[] } }>(
    `/issue/${encodeURIComponent(issueKey)}`,
    { params: { fields: 'issuelinks' } }
  );
  const raw = data.fields?.issuelinks;
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: IssueTrackerIssueLink[] = [];
  for (const item of raw) {
    const mapped = mapJiraIssueLink(issueKey, item);
    if (mapped) {
      out.push(mapped);
    }
  }
  return out;
}

export async function createJiraIssueLink(
  api: AxiosInstance,
  issueKey: string,
  input: IssueTrackerCreateIssueLinkInput
): Promise<IssueTrackerIssueLink> {
  const typeName = JIRA_LINK_TYPE_NAME[input.relationship];
  const target = input.targetIssueKey.trim();

  // blocked_by: target blocks current → outwardIssue = current, inwardIssue semantics via Blocks type
  const body =
    input.relationship === 'blocked_by'
      ? {
          type: { name: typeName },
          inwardIssue: { key: issueKey },
          outwardIssue: { key: target },
        }
      : {
          type: { name: typeName },
          inwardIssue: { key: target },
          outwardIssue: { key: issueKey },
        };

  await api.post('/issueLink', body);

  // Jira create has no body — reload links and pick the matching edge.
  const links = await listJiraIssueLinks(api, issueKey);
  const match = links.find(
    (link) =>
      link.linkedIssueKey === target &&
      (link.relationship === input.relationship ||
        (input.relationship === 'duplicates' && link.relationship === 'duplicated_by'))
  );
  if (match) {
    return match;
  }
  return {
    id: '',
    direction: 'outward',
    relationship: input.relationship,
    linkedIssueKey: target,
    linkedSummary: null,
    linkedStatus: null,
  };
}

export async function deleteJiraIssueLink(
  api: AxiosInstance,
  _issueKey: string,
  trackerLinkId: string
): Promise<void> {
  await api.delete(`/issueLink/${encodeURIComponent(trackerLinkId)}`);
}


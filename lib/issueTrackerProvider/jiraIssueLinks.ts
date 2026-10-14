import type {
  IssueLinkCreateRelationship,
  IssueTrackerCreateIssueLinkInput,
  IssueTrackerIssueLink,
} from './issueLinkTypes';
import type { AxiosInstance } from 'axios';

import { resolveStoredIssueLinkRelationship } from './issueLinkTypes';
import { shouldStopJiraBoardPages } from './jiraCatalog';
import { postJiraIssueSearch, readJiraSearchNextPageToken } from './jiraIssueSearchRequest';

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

const SAFE_JIRA_ISSUE_KEY = /^[A-Za-z]\w*-\d+$/;
const harvestedJiraIssueLinks = new WeakMap<object, IssueTrackerIssueLink[]>();

const JIRA_LINK_TYPE_NAME: Record<IssueLinkCreateRelationship, string> = {
  relates: 'Relates',
  blocks: 'Blocks',
  blocked_by: 'Blocks',
  duplicates: 'Duplicate',
};

export function mapJiraIssueLink(
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

  const stored = resolveStoredIssueLinkRelationship(label ?? '');
  if (!stored) {
    return null;
  }

  return {
    id,
    direction,
    relationship: stored.relationship,
    relationshipLabel: stored.relationshipLabel,
    linkedIssueKey,
    linkedSummary: linkedIssue?.fields?.summary?.trim() || null,
    linkedStatus: linkedIssue?.fields?.status?.name?.trim() || null,
  };
}

function mapJiraIssueLinkList(issueKey: string, raw: unknown): IssueTrackerIssueLink[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: IssueTrackerIssueLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const mapped = mapJiraIssueLink(issueKey, item);
    if (mapped) {
      out.push(mapped);
    }
  }
  return out;
}

/**
 * Запоминает `issuelinks` с объекта задачи поиска спринта.
 * Пустой массив — поле было и связей нет. Нет массива — не кэшируем.
 */
export function harvestJiraIssueLinks(
  owner: object,
  issueKey: string,
  fields: { issuelinks?: unknown } | null | undefined
): void {
  const raw = fields?.issuelinks;
  if (!Array.isArray(raw)) {
    return;
  }
  harvestedJiraIssueLinks.set(owner, mapJiraIssueLinkList(issueKey, raw));
}

export function readHarvestedJiraIssueLinks(
  owner: object | undefined
): IssueTrackerIssueLink[] | undefined {
  if (!owner) {
    return undefined;
  }
  return harvestedJiraIssueLinks.get(owner);
}

interface JiraSearchLinkRow {
  issuelinks: unknown;
  key: string;
}

function jiraSearchLinkRows(data: unknown): JiraSearchLinkRow[] {
  if (!data || typeof data !== 'object') {
    return [];
  }
  const issues = (data as { issues?: unknown }).issues;
  if (!Array.isArray(issues)) {
    return [];
  }
  const out: JiraSearchLinkRow[] = [];
  for (const row of issues) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const key = (row as { key?: unknown }).key;
    if (typeof key !== 'string' || !key.trim()) {
      continue;
    }
    const fields = (row as { fields?: { issuelinks?: unknown } }).fields;
    out.push({ issuelinks: fields?.issuelinks, key: key.trim() });
  }
  return out;
}

async function fillJiraIssueLinksFromSearch(
  api: AxiosInstance,
  issueKeys: string[],
  out: Record<string, IssueTrackerIssueLink[]>
): Promise<void> {
  let startAt = 0;
  let nextPageToken: string | undefined;
  const maxResults = Math.min(100, Math.max(issueKeys.length, 1));
  for (let page = 0; page < 4; page += 1) {
    const data = await postJiraIssueSearch(api, {
      fields: ['issuelinks'],
      jql: `key in (${issueKeys.join(',')})`,
      maxResults,
      nextPageToken,
      startAt,
    });
    const rows = jiraSearchLinkRows(data);
    for (const row of rows) {
      out[row.key] = mapJiraIssueLinkList(row.key, row.issuelinks);
    }
    if (shouldStopJiraBoardPages(data, startAt, rows.length, maxResults)) {
      return;
    }
    nextPageToken = readJiraSearchNextPageToken(data);
    startAt += rows.length;
  }
}

/** Один поиск `key in (...)` вместо GET /issue на каждый ключ. */
export async function listJiraIssueLinksForKeys(
  api: AxiosInstance,
  issueKeys: string[]
): Promise<Record<string, IssueTrackerIssueLink[]>> {
  const unique = [...new Set(issueKeys.map((key) => key.trim()).filter(Boolean))];
  const out: Record<string, IssueTrackerIssueLink[]> = {};
  for (const key of unique) {
    out[key] = [];
  }
  const safe = unique.filter((key) => SAFE_JIRA_ISSUE_KEY.test(key));
  const unsafe = unique.filter((key) => !SAFE_JIRA_ISSUE_KEY.test(key));
  if (safe.length > 0) {
    await fillJiraIssueLinksFromSearch(api, safe, out);
  }
  if (unsafe.length > 0) {
    await Promise.all(
      unsafe.map(async (issueKey) => {
        out[issueKey] = await listJiraIssueLinks(api, issueKey);
      })
    );
  }
  return out;
}

export async function listJiraIssueLinks(
  api: AxiosInstance,
  issueKey: string
): Promise<IssueTrackerIssueLink[]> {
  const { data } = await api.get<{ fields?: { issuelinks?: JiraIssueLinkPayload[] } }>(
    `/issue/${encodeURIComponent(issueKey)}`,
    { params: { fields: 'issuelinks' } }
  );
  return mapJiraIssueLinkList(issueKey, data.fields?.issuelinks);
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
    relationshipLabel: input.relationship.replaceAll('_', ' '),
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


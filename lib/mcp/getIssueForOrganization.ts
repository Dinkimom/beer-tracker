import type { IssueTrackerIssueLink } from '@/lib/issueTrackerProvider/issueLinkTypes';
import type { IssueTrackerIssue, IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';

import { resolveMcpIssueStatusCategory } from '@/lib/mcp/resolveMcpIssueStatusCategory';

const MAX_COMMENTS = 40;
const MAX_DESCRIPTION = 8000;

/** Описание задачи для MCP: trim, пустое → null, длинное обрезается до MAX_DESCRIPTION. */
export function trimDescription(text: string | undefined): string | null {
  const value = text?.trim() ?? '';
  if (!value) {
    return null;
  }
  return value.length > MAX_DESCRIPTION ? `${value.slice(0, MAX_DESCRIPTION - 1)}…` : value;
}

function sprintIdsOf(sprint: IssueTrackerIssue['sprint']): string[] {
  if (!sprint) {
    return [];
  }
  const rows = Array.isArray(sprint) ? sprint : [sprint];
  const ids: string[] = [];
  for (const row of rows) {
    if (typeof row === 'string') {
      const id = row.trim();
      if (id) {
        ids.push(id);
      }
      continue;
    }
    const id = String(row.id ?? '').trim();
    if (id) {
      ids.push(id);
    }
  }
  return [...new Set(ids)];
}

async function loadIssueLinks(
  issueTracker: IssueTrackerProviderClient,
  issue: IssueTrackerIssue,
  warnings: string[]
): Promise<IssueTrackerIssueLink[]> {
  if (issue.issueLinks !== undefined) {
    return issue.issueLinks;
  }
  try {
    return await issueTracker.listIssueLinks(issue.key);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`links_unavailable: ${message}`);
    return [];
  }
}

async function loadIssueComments(
  issueTracker: IssueTrackerProviderClient,
  issueKey: string,
  warnings: string[]
): Promise<Array<{ author: string; createdAt: string; id: string; text: string }>> {
  try {
    const changelog = await issueTracker.getIssueChangelogWithComments(issueKey);
    if (changelog.comments.length > MAX_COMMENTS) {
      warnings.push(`comments_truncated: showing first ${MAX_COMMENTS}`);
    }
    return changelog.comments.slice(0, MAX_COMMENTS).map((row) => ({
      author: row.createdBy?.display?.trim() || row.createdBy?.id || 'unknown',
      createdAt: row.createdAt,
      id: String(row.id),
      text: row.text?.trim() || '',
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`comments_unavailable: ${message}`);
    return [];
  }
}

/** Live tracker issue detail for MCP (description, links, comments). */
export async function getIssueForOrganization(input: {
  includeComments?: boolean;
  issueKey: string;
  issueTracker: IssueTrackerProviderClient;
}): Promise<{
  issue: {
    assignee: string | null;
    comments: Array<{ author: string; createdAt: string; id: string; text: string }>;
    createdAt: string | null;
    description: string | null;
    issueType: string | null;
    key: string;
    links: Array<{
      direction: string;
      key: string;
      relationship: string | null;
      relationshipLabel?: string;
      summary: string | null;
    }>;
    parentKey: string | null;
    priority: string | null;
    sprintIds: string[];
    status: string | null;
    statusCategory: string;
    statusDisplay: string | null;
    statusType: string | null;
    summary: string;
    updatedAt: string | null;
  } | null;
  warnings: string[];
}> {
  const key = input.issueKey.trim();
  const warnings: string[] = [];
  const issue = await input.issueTracker.getIssue(key);
  if (!issue) {
    return { issue: null, warnings: [`issue_not_found: ${key}`] };
  }

  const links = await loadIssueLinks(input.issueTracker, issue, warnings);
  const comments =
    input.includeComments === false
      ? []
      : await loadIssueComments(input.issueTracker, key, warnings);

  const statusKey = issue.status?.key?.trim() || null;
  const statusTypeKey = issue.statusType?.key?.trim() || null;

  return {
    issue: {
      assignee: issue.assignee?.display?.trim() || issue.assignee?.id || null,
      comments,
      createdAt: issue.createdAt?.trim() || null,
      description: trimDescription(issue.description),
      issueType: issue.type?.display?.trim() || issue.type?.key?.trim() || null,
      key: issue.key,
      links: links.map((link) => ({
        direction: link.direction,
        key: link.linkedIssueKey,
        relationship: link.relationship,
        ...(link.relationshipLabel ? { relationshipLabel: link.relationshipLabel } : {}),
        summary: link.linkedSummary?.trim() || null,
      })),
      parentKey: issue.parent?.key?.trim() || null,
      priority: issue.priority?.display?.trim() || issue.priority?.key?.trim() || null,
      sprintIds: sprintIdsOf(issue.sprint),
      status: statusKey,
      statusCategory: resolveMcpIssueStatusCategory({
        statusKey,
        statusTypeKey,
      }),
      statusDisplay: issue.status?.display?.trim() || null,
      statusType: statusTypeKey,
      summary: issue.summary?.trim() || issue.key,
      updatedAt: issue.updatedAt?.trim() || null,
    },
    warnings,
  };
}

import type { IssueTrackerIssue, IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';

interface SearchIssuesHit {
  createdAt: string | null;
  descriptionPreview: string | null;
  issueType: string | null;
  key: string;
  linkKeys: string[];
  priority: string | null;
  sprintIds: string[];
  status: string | null;
  statusDisplay: string | null;
  statusType: string | null;
  summary: string;
}

interface SearchIssuesInput {
  boardId: number;
  issueType?: string;
  limit?: number;
  notInActiveSprint?: boolean;
  priority?: string;
  query?: string;
  status?: string;
  statusType?: string;
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function sprintIdsOf(issue: IssueTrackerIssue): string[] {
  const sprint = issue.sprint;
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

function includesNormalized(haystack: string, needle: string): boolean {
  return haystack.includes(needle);
}

function matchesKeyOrDisplay(
  want: string | undefined,
  key: string | null | undefined,
  display: string | null | undefined
): boolean {
  if (!want) {
    return true;
  }
  const needle = normalize(want);
  return includesNormalized(normalize(key), needle) || includesNormalized(normalize(display), needle);
}

function matchesFilters(issue: IssueTrackerIssue, input: SearchIssuesInput): boolean {
  if (!matchesKeyOrDisplay(input.issueType, issue.type?.key, issue.type?.display)) {
    return false;
  }
  if (!matchesKeyOrDisplay(input.status, issue.status?.key, issue.status?.display)) {
    return false;
  }
  if (!matchesKeyOrDisplay(input.statusType, issue.statusType?.key, undefined)) {
    return false;
  }
  if (!matchesKeyOrDisplay(input.priority, issue.priority?.key, issue.priority?.display)) {
    return false;
  }
  return !input.notInActiveSprint || sprintIdsOf(issue).length === 0;
}

function descriptionPreview(description: string | undefined): string | null {
  const text = description?.replace(/\s+/g, ' ').trim() ?? '';
  if (!text) {
    return null;
  }
  return text.length > 280 ? `${text.slice(0, 277)}…` : text;
}

function toHit(issue: IssueTrackerIssue, linkKeys: string[]): SearchIssuesHit {
  return {
    createdAt: issue.createdAt?.trim() || null,
    descriptionPreview: descriptionPreview(issue.description),
    issueType: issue.type?.display?.trim() || issue.type?.key?.trim() || null,
    key: issue.key,
    linkKeys,
    priority: issue.priority?.display?.trim() || issue.priority?.key?.trim() || null,
    sprintIds: sprintIdsOf(issue),
    status: issue.status?.key?.trim() || null,
    statusDisplay: issue.status?.display?.trim() || null,
    statusType: issue.statusType?.key?.trim() || null,
    summary: issue.summary?.trim() || issue.key,
  };
}

async function loadCandidateIssues(
  issueTracker: IssueTrackerProviderClient,
  input: SearchIssuesInput,
  fetchCap: number
): Promise<IssueTrackerIssue[]> {
  const query = input.query?.trim() ?? '';
  if (query) {
    return issueTracker.searchIssuesOnBoard(input.boardId, query, {});
  }
  const listed = await issueTracker.listIssuesForBoard(input.boardId, {
    maxTotalIssues: fetchCap,
    perPage: Math.min(100, fetchCap),
  });
  return listed.issues;
}

async function loadLinkKeysByIssue(
  issueTracker: IssueTrackerProviderClient,
  keys: string[]
): Promise<Record<string, string[]>> {
  if (keys.length === 0) {
    return {};
  }
  try {
    const batch = await issueTracker.listIssueLinksBatch(keys);
    const out: Record<string, string[]> = {};
    for (const key of keys) {
      const links = batch[key] ?? [];
      out[key] = [
        ...new Set(
          links
            .map((link) => link.linkedIssueKey?.trim())
            .filter((value): value is string => Boolean(value))
            .filter((value) => value !== key)
        ),
      ];
    }
    return out;
  } catch {
    return Object.fromEntries(keys.map((key) => [key, []]));
  }
}

/** Board/backlog issue search for MCP agents (filtered, compact hits). */
export async function searchIssuesForOrganization(input: {
  filters: SearchIssuesInput;
  issueTracker: IssueTrackerProviderClient;
}): Promise<{ hits: SearchIssuesHit[]; truncated: boolean; warnings: string[] }> {
  const limit = Math.min(50, Math.max(1, input.filters.limit ?? 30));
  const fetchCap = Math.min(300, Math.max(limit * 4, 80));
  const warnings: string[] = [];
  let candidates: IssueTrackerIssue[];
  try {
    candidates = await loadCandidateIssues(input.issueTracker, input.filters, fetchCap);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      hits: [],
      truncated: false,
      warnings: [`tracker_search_failed: ${message}`],
    };
  }

  const filtered = candidates.filter((issue) => matchesFilters(issue, input.filters));
  const truncated = filtered.length > limit || candidates.length >= fetchCap;
  const page = filtered.slice(0, limit);
  if (truncated) {
    warnings.push('truncated: refine query/filters or raise limit (max 50)');
  }

  const linkKeysByIssue = await loadLinkKeysByIssue(
    input.issueTracker,
    page.map((issue) => issue.key)
  );
  return {
    hits: page.map((issue) => toHit(issue, linkKeysByIssue[issue.key] ?? [])),
    truncated,
    warnings,
  };
}

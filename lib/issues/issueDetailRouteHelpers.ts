import type { IssueTrackerIssue, IssueTrackerProviderClient, IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';
import type { ChecklistItem } from '@/types/tracker';

import { NextResponse } from 'next/server';

import { issueTrackerProviderCapabilities } from '@/lib/issueTrackerProvider/issueTrackerUi';
import { jiraAdfToMarkdown } from '@/lib/issueTrackerProvider/jiraAdfToMarkdown';
import { unwrapIssueSnapshotPayload } from '@/lib/issueTrackerProvider/snapshotEnvelope';

type IssueDetailSource = Pick<
  IssueTrackerIssue,
  'createdAt' | 'description' | 'key' | 'status' | 'statusType' | 'summary' | 'updatedAt'
> & {
  resolvedAt?: string;
};

function normalizeIssueDetailDescription(raw: unknown): string | undefined {
  if (typeof raw === 'string') {
    const text = raw.trim();
    return text || undefined;
  }
  // Legacy Jira Cloud snapshots / API v3 may still hold ADF objects.
  const fromAdf = jiraAdfToMarkdown(raw);
  return fromAdf || undefined;
}

function withNormalizedDescription(source: IssueDetailSource): IssueDetailSource {
  return {
    ...source,
    description: normalizeIssueDetailDescription(source.description),
  };
}

function issueDetailSourceFromSnapshotPayload(stored: unknown): IssueDetailSource | null {
  const { payload } = unwrapIssueSnapshotPayload(stored);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  const rec = payload as Record<string, unknown>;
  if (typeof rec.key !== 'string' || rec.key.length === 0) {
    return null;
  }
  return withNormalizedDescription({
    ...(payload as IssueDetailSource),
    description: normalizeIssueDetailDescription(rec.description),
  });
}

function snapshotHasDescription(source: IssueDetailSource): boolean {
  return typeof source.description === 'string' && source.description.length > 0;
}

export async function resolveIssueDetailSource(params: {
  findIssueSnapshot: (orgId: string, key: string) => Promise<{ payload: unknown } | null>;
  getIssue: (key: string) => Promise<IssueDetailSource | null>;
  organizationId: string;
  validIssueKey: string;
}): Promise<IssueDetailSource | NextResponse> {
  const snapshotRow = await params.findIssueSnapshot(params.organizationId, params.validIssueKey);
  const fromSnapshot = issueDetailSourceFromSnapshotPayload(snapshotRow?.payload);
  // Planner list tasks omit description; Jira Cloud snapshots may lack it when ADF
  // was dropped. Prefer a live getIssue so the task sidebar can load the body.
  if (fromSnapshot && snapshotHasDescription(fromSnapshot)) {
    return fromSnapshot;
  }
  const issue = await params.getIssue(params.validIssueKey);
  if (issue) {
    return withNormalizedDescription(issue);
  }
  if (fromSnapshot) {
    return fromSnapshot;
  }
  return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
}

export function loadIssueTrackerChecklistItems(
  issueTracker: Pick<IssueTrackerProviderClient, 'getIssueChecklist'>,
  issueKey: string,
  kind: IssueTrackerProviderKind
): Promise<ChecklistItem[]> {
  if (!issueTrackerProviderCapabilities(kind).supportsChecklists) {
    return Promise.resolve([]);
  }
  return issueTracker.getIssueChecklist(issueKey);
}

export function buildIssueDetailResponse(
  issue: IssueDetailSource,
  checklistItems: Array<{ checked: boolean }>
) {
  const checklistDone = checklistItems.filter((item) => item.checked).length;
  const statusKey = issue.status?.key || issue.statusType?.key || null;
  return {
    createdAt: issue.createdAt ?? null,
    description: issue.description || null,
    checklistItems,
    checklistDone,
    checklistTotal: checklistItems.length,
    status: issue.status || null,
    key: issue.key,
    resolvedAt: issue.resolvedAt ?? null,
    summary: issue.summary,
    statusKey,
    originalStatus: statusKey,
    updatedAt: issue.updatedAt ?? null,
  };
}

export function buildWorkEstimatesFromBody(body: {
  storyPoints?: number | null;
  testPoints?: number | null;
}): NextResponse | { storyPoints?: number | null; testPoints?: number | null } {
  const estimates: { storyPoints?: number | null; testPoints?: number | null } = {};
  if (body.storyPoints !== undefined) estimates.storyPoints = body.storyPoints;
  if (body.testPoints !== undefined) estimates.testPoints = body.testPoints;
  if (estimates.storyPoints === undefined && estimates.testPoints === undefined) {
    return NextResponse.json({ error: 'storyPoints or testPoints is required' }, { status: 400 });
  }
  return estimates;
}

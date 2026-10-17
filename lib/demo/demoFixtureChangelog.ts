import type { ChangelogEntry, IssueChangelogWithComments } from '@/types/tracker';

interface StatusRef {
  display: string;
  key: string;
}

function statusChange(
  id: string,
  updatedAt: string,
  from: StatusRef | null,
  to: StatusRef
): ChangelogEntry {
  return {
    createdBy: { display: 'Demo User', id: 'demo-user' },
    fields: [
      {
        field: { display: 'Status', id: 'status' },
        from: from ? { display: from.display, id: from.key, key: from.key } : null,
        to: { display: to.display, id: to.key, key: to.key },
      },
    ],
    id,
    type: 'IssueWorkflow',
    updatedAt,
  };
}

const OPEN: StatusRef = { display: 'Open', key: 'open' };
const IN_PROGRESS: StatusRef = { display: 'In progress', key: 'inProgress' };
const IN_REVIEW: StatusRef = { display: 'In review', key: 'inReview' };
const CLOSED: StatusRef = { display: 'Closed', key: 'closed' };
const BLOCKED: StatusRef = { display: 'Blocked', key: 'blocked' };
const READY_FOR_TEST: StatusRef = { display: 'Ready for test', key: 'readyForTest' };
const IN_TESTING: StatusRef = { display: 'In testing', key: 'inTesting' };

function pack(changelog: ChangelogEntry[]): IssueChangelogWithComments {
  return { changelog, comments: [] };
}

/** Status history so `/demo/planner` can draw the swimlane fact timeline. */
export function buildDemoIssueChangelogs(): Record<string, IssueChangelogWithComments> {
  return {
    'DEMO-101': pack([
      statusChange('demo-101-1', '2026-10-14T06:00:00.000Z', OPEN, IN_PROGRESS),
    ]),
    'DEMO-102': pack([
      statusChange('demo-102-1', '2026-10-13T06:00:00.000Z', OPEN, IN_PROGRESS),
      statusChange('demo-102-2', '2026-10-14T09:00:00.000Z', IN_PROGRESS, IN_REVIEW),
      statusChange('demo-102-3', '2026-10-15T06:00:00.000Z', IN_REVIEW, IN_PROGRESS),
    ]),
    'DEMO-103': pack([
      statusChange('demo-103-1', '2026-10-15T06:00:00.000Z', OPEN, READY_FOR_TEST),
      statusChange('demo-103-2', '2026-10-16T06:00:00.000Z', READY_FOR_TEST, IN_TESTING),
    ]),
    'DEMO-104': pack([
      statusChange('demo-104-1', '2026-10-13T06:00:00.000Z', OPEN, IN_PROGRESS),
      statusChange('demo-104-2', '2026-10-14T08:00:00.000Z', IN_PROGRESS, IN_REVIEW),
      statusChange('demo-104-3', '2026-10-15T11:00:00.000Z', IN_REVIEW, CLOSED),
    ]),
    'DEMO-106': pack([
      statusChange('demo-106-1', '2026-10-15T07:00:00.000Z', OPEN, IN_PROGRESS),
      statusChange('demo-106-2', '2026-10-16T05:00:00.000Z', IN_PROGRESS, BLOCKED),
    ]),
    'DEMO-107': pack([
      statusChange('demo-107-1', '2026-10-13T07:00:00.000Z', OPEN, IN_PROGRESS),
      statusChange('demo-107-2', '2026-10-15T10:00:00.000Z', IN_PROGRESS, IN_REVIEW),
    ]),
  };
}

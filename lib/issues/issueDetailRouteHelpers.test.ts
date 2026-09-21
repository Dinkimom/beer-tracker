import { describe, expect, it, vi } from 'vitest';

import { wrapIssueSnapshotForStorage } from '@/lib/issueTrackerProvider/snapshotEnvelope';

import { buildIssueDetailResponse, loadIssueTrackerChecklistItems, resolveIssueDetailSource } from './issueDetailRouteHelpers';

describe('buildIssueDetailResponse', () => {
  it('includes description and timestamps for the task sidebar', () => {
    const body = buildIssueDetailResponse(
      {
        createdAt: '2026-08-01T00:00:00.000+0000',
        description: 'Body',
        key: 'VER-1',
        resolvedAt: '2026-08-21T00:00:00.000+0000',
        summary: 'Task',
        updatedAt: '2026-08-20T00:00:00.000+0000',
      },
      [{ checked: true }, { checked: false }]
    );
    expect(body).toMatchObject({
      checklistDone: 1,
      checklistTotal: 2,
      createdAt: '2026-08-01T00:00:00.000+0000',
      description: 'Body',
      key: 'VER-1',
      resolvedAt: '2026-08-21T00:00:00.000+0000',
      summary: 'Task',
      updatedAt: '2026-08-20T00:00:00.000+0000',
    });
  });

  it('unwraps a snapshot envelope before building the sidebar JSON', async () => {
    const issue = await resolveIssueDetailSource({
      findIssueSnapshot: () =>
        Promise.resolve({
          payload: wrapIssueSnapshotForStorage('yandex-tracker', {
            key: 'VER-1',
            summary: 'Task',
            description: 'Body',
          }),
        }),
      getIssue: () => Promise.resolve(null),
      organizationId: 'org-1',
      validIssueKey: 'VER-1',
    });

    expect(issue).not.toBeInstanceOf(Response);
    expect(buildIssueDetailResponse(issue as never, [])).toMatchObject({
      description: 'Body',
      key: 'VER-1',
      summary: 'Task',
    });
  });

  it('live-fetches when the snapshot has no description (Jira Cloud ADF gap)', async () => {
    const getIssue = vi.fn(() =>
      Promise.resolve({
        description: 'From Jira',
        key: 'PROJ-1',
        summary: 'Task',
      })
    );
    const issue = await resolveIssueDetailSource({
      findIssueSnapshot: () =>
        Promise.resolve({
          payload: wrapIssueSnapshotForStorage('jira', {
            key: 'PROJ-1',
            summary: 'Task',
          }),
        }),
      getIssue,
      organizationId: 'org-1',
      validIssueKey: 'PROJ-1',
    });

    expect(getIssue).toHaveBeenCalledWith('PROJ-1');
    expect(issue).toMatchObject({ description: 'From Jira', key: 'PROJ-1' });
  });

  it('converts ADF left in a snapshot description field', async () => {
    const issue = await resolveIssueDetailSource({
      findIssueSnapshot: () =>
        Promise.resolve({
          payload: wrapIssueSnapshotForStorage('jira', {
            description: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'ADF body' }],
                },
              ],
            },
            key: 'PROJ-2',
            summary: 'Task',
          }),
        }),
      getIssue: () => Promise.resolve(null),
      organizationId: 'org-1',
      validIssueKey: 'PROJ-2',
    });

    expect(issue).toMatchObject({ description: 'ADF body', key: 'PROJ-2' });
  });
});

describe('loadIssueTrackerChecklistItems', () => {
  it('skips getIssueChecklist on Jira', async () => {
    const getIssueChecklist = vi.fn(() => Promise.resolve([]));
    await expect(
      loadIssueTrackerChecklistItems({ getIssueChecklist }, 'PROJ-1', 'jira-cloud')
    ).resolves.toEqual([]);
    expect(getIssueChecklist).not.toHaveBeenCalled();
  });

  it('loads checklist items on Yandex Tracker', async () => {
    const items = [
      { checked: true, checklistItemType: 'standard' as const, id: 'c1', text: 'Done' },
    ];
    const getIssueChecklist = vi.fn(() => Promise.resolve(items));
    await expect(
      loadIssueTrackerChecklistItems({ getIssueChecklist }, 'BT-1', 'tracker')
    ).resolves.toEqual(items);
    expect(getIssueChecklist).toHaveBeenCalledWith('BT-1');
  });
});

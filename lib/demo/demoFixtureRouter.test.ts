import type { InternalAxiosRequestConfig } from 'axios';

import { beforeEach, describe, expect, it } from 'vitest';

import { handleDemoFixtureRequest } from './demoFixtureRouter';
import { resetDemoFixtureStore } from './demoFixtureStore';
import {
  DEMO_BOARD_ID,
  DEMO_DEV_ALICE,
  DEMO_DEV_CAROL,
  DEMO_ORG_ID,
  DEMO_SPRINT_ID,
  DEMO_SPRINT_NEXT_ID,
} from './demoIds';

function cfg(
  method: string,
  url: string,
  extras?: Partial<InternalAxiosRequestConfig>
): InternalAxiosRequestConfig {
  return {
    method,
    url,
    baseURL: '/api/demo',
    headers: {} as InternalAxiosRequestConfig['headers'],
    ...extras,
  };
}

describe('handleDemoFixtureRequest', () => {
  beforeEach(() => {
    resetDemoFixtureStore();
  });

  it('returns multi-quarter sprint metrics history ending with the current sprint', () => {
    const result = handleDemoFixtureRequest(
      cfg('get', `/boards/${DEMO_BOARD_ID}/sprint-metrics`, { params: { quarters: 4 } })
    );
    expect(result.status).toBe(200);
    const data = result.data as { pending: number; records: Array<{ open: boolean; sprintId: number }> };
    expect(data.pending).toBe(0);
    expect(data.records.length).toBeGreaterThan(15);
    expect(data.records.at(-1)).toMatchObject({ open: true, sprintId: DEMO_SPRINT_ID });
    expect(data.records.filter((record) => record.open)).toHaveLength(1);
  });

  it('counts every sprint goal in the score and follows goal checks', () => {
    const score = () =>
      (handleDemoFixtureRequest(cfg('get', `/sprints/${DEMO_SPRINT_ID}/score`)).data as {
        rows: Array<{ goals_done: number; goals_percent: number; goals_total: number }>;
      }).rows[0];
    expect(score()).toMatchObject({ goals_done: 1, goals_percent: 25, goals_total: 4 });

    handleDemoFixtureRequest(cfg('patch', '/sprint-goals/goal-del-1', { data: { checked: true } }));
    expect(score()).toMatchObject({ goals_done: 2, goals_percent: 50, goals_total: 4 });
  });

  it('finds people outside the board team and adds the picked one to the team', () => {
    const search = (q: string) =>
      (
        handleDemoFixtureRequest(cfg('get', '/teams/members/registry-search', { params: { boardId: DEMO_BOARD_ID, q } }))
          .data as { items: Array<{ displayName: string; staffUid: string }> }
      ).items;
    const members = () =>
      (handleDemoFixtureRequest(cfg('get', `/teams/members?boardId=${DEMO_BOARD_ID}`)).data as { developers: Array<{ id: string }> })
        .developers;

    expect(search('grace').map((item) => item.displayName)).toEqual(['Grace Hopper']);
    expect(search('zzz')).toEqual([]);
    const [grace] = search('grace');
    const before = members().length;

    const added = handleDemoFixtureRequest(
      cfg('post', `/teams/members?boardId=${DEMO_BOARD_ID}`, { data: { staffUid: grace!.staffUid } })
    );
    expect(added.status).toBe(200);
    expect(members()).toHaveLength(before + 1);
    // Уже в команде — в поиске её больше нет, повторное добавление не проходит.
    expect(search('grace')).toEqual([]);
    expect(
      handleDemoFixtureRequest(cfg('post', `/teams/members?boardId=${DEMO_BOARD_ID}`, { data: { staffUid: grace!.staffUid } })).status
    ).toBe(404);
  });

  it('returns no agent sessions', () => {
    const result = handleDemoFixtureRequest(cfg('get', `/sprints/${DEMO_SPRINT_ID}/agent-sessions`));
    expect(result).toEqual({ data: { draftSessionId: null, sessions: [] }, status: 200 });
  });

  it('returns the demo board list', () => {
    const result = handleDemoFixtureRequest(cfg('get', '/boards'));
    expect(result.status).toBe(200);
    expect(result.data).toEqual([
      expect.objectContaining({ id: DEMO_BOARD_ID, name: 'Demo Board' }),
    ]);
  });

  it('returns sprint tasks for the fixture sprint', () => {
    const result = handleDemoFixtureRequest(
      cfg('get', `/tracker?sprintId=${DEMO_SPRINT_ID}&boardId=${DEMO_BOARD_ID}`)
    );
    expect(result.status).toBe(200);
    const data = result.data as { tasks: unknown[]; developers: unknown[] };
    expect(data.tasks.length).toBeGreaterThan(0);
    expect(data.developers.length).toBeGreaterThan(0);
  });

  it('returns backlog pagination', () => {
    const result = handleDemoFixtureRequest(
      cfg('get', `/backlog?boardId=${DEMO_BOARD_ID}&page=1&perPage=50`)
    );
    expect(result.status).toBe(200);
    const data = result.data as { tasks: unknown[]; pagination: { totalCount: number } };
    expect(data.pagination.totalCount).toBeGreaterThan(0);
    expect(data.tasks.length).toBe(data.pagination.totalCount);
  });

  it('returns burndown points and retro board', () => {
    const burndown = handleDemoFixtureRequest(cfg('get', `/sprints/${DEMO_SPRINT_ID}/burndown`));
    expect(burndown.status).toBe(200);
    expect(burndown.data).toEqual(
      expect.objectContaining({
        dataPoints: expect.any(Array),
        initialSP: expect.any(Number),
      })
    );

    const retro = handleDemoFixtureRequest(cfg('get', `/sprints/${DEMO_SPRINT_ID}/retro`));
    expect(retro.status).toBe(200);
    expect(retro.data).toEqual(
      expect.objectContaining({
        board: expect.objectContaining({ sprintId: DEMO_SPRINT_ID }),
      })
    );
  });

  it('returns a product session for the demo org', () => {
    const result = handleDemoFixtureRequest(cfg('get', '/auth/session'));
    expect(result.status).toBe(200);
    expect(result.data).toEqual(
      expect.objectContaining({
        organizations: [expect.objectContaining({ id: DEMO_ORG_ID })],
      })
    );
  });

  it('keeps created, updated and deleted sticky notes in memory', () => {
    const url = `/sprints/${DEMO_SPRINT_ID}/comments`;
    const created = handleDemoFixtureRequest(
      cfg('post', url, {
        data: { assigneeId: DEMO_DEV_ALICE, day: 1, height: 2, kind: 'widget', part: 0, text: 'board', width: 2 },
      })
    );
    const id = (created.data as { comment: { id: string } }).comment.id;
    expect(id).toMatch(/^demo-comment-/);

    handleDemoFixtureRequest(cfg('put', `${url}?commentId=${id}`, { data: { text: 'next move' } }));
    const listed = handleDemoFixtureRequest(cfg('get', url)).data as {
      comments: Array<{ id: string; kind?: string; text: string; width: number }>;
    };
    expect(listed.comments.find((c) => c.id === id)).toEqual(
      expect.objectContaining({ kind: 'widget', text: 'next move', width: 2 })
    );

    expect(handleDemoFixtureRequest(cfg('put', `${url}?commentId=missing`, { data: {} })).status).toBe(404);

    handleDemoFixtureRequest(cfg('delete', `${url}?commentId=${id}`));
    const afterDelete = handleDemoFixtureRequest(cfg('get', url)).data as { comments: Array<{ id: string }> };
    expect(afterDelete.comments.some((c) => c.id === id)).toBe(false);
  });

  it('returns seeded sticky notes and Carol vacation on sprint start days', () => {
    const comments = handleDemoFixtureRequest(cfg('get', `/sprints/${DEMO_SPRINT_ID}/comments`));
    expect(comments.status).toBe(200);
    expect(comments.data).toEqual(
      expect.objectContaining({
        comments: expect.arrayContaining([
          expect.objectContaining({ id: 'demo-note-1', text: expect.any(String) }),
          expect.objectContaining({ id: 'demo-note-2', text: expect.any(String) }),
        ]),
      })
    );

    const availability = handleDemoFixtureRequest(
      cfg('get', `/quarterly-plans/availability/board-events?boardId=${DEMO_BOARD_ID}`)
    );
    expect(availability.status).toBe(200);
    expect(availability.data).toEqual({
      events: expect.arrayContaining([
        expect.objectContaining({
          endDate: '2026-10-14',
          eventType: 'vacation',
          memberId: DEMO_DEV_CAROL,
          startDate: '2026-10-13',
        }),
      ]),
    });
  });

  it('has no holidays in the day-off calendar, compact dates included', () => {
    const codes = handleDemoFixtureRequest(
      cfg('get', '/holidays/isdayoff', { params: { cc: 'ru', date1: '20261102', date2: '20261106' } })
    );
    expect(codes.data).toBe('00000');
  });

  it('serves sprint goals with their quarterly plan row and keeps a changed row', () => {
    const goalsUrl = `/sprint-goals?sprintId=${DEMO_SPRINT_ID}&goalType=delivery`;
    const read = () =>
      (handleDemoFixtureRequest(cfg('get', goalsUrl)).data as {
        checklistItems: Array<{ id: string; planRow?: unknown }>;
      }).checklistItems;
    expect(read()[0]).toMatchObject({
      id: 'goal-del-1',
      planRow: { quarter: 4, rowId: 'demo-direction-1-epic-2', year: 2026 },
    });
    expect(read()[1]?.planRow).toBeUndefined();

    const planRow = { quarter: 4, rowId: 'demo-direction-2', year: 2026 };
    handleDemoFixtureRequest(cfg('patch', '/sprint-goals/goal-del-2', { data: { planRow } }));
    handleDemoFixtureRequest(cfg('patch', '/sprint-goals/goal-del-1', { data: { planRow: null } }));
    handleDemoFixtureRequest(cfg('patch', '/sprint-goals/goal-del-2', { data: { checked: false } }));
    // Третья цель — «только цель в строке» (QG8): её привязку правки двух первых не трогают.
    expect(read().map((item) => item.planRow)).toEqual([
      null,
      planRow,
      { quarter: 4, rowId: 'demo-direction-3-epic-3', year: 2026 },
    ]);
  });

  it('serves the quarterly plan and keeps edits and availability changes', () => {
    const plan = handleDemoFixtureRequest(cfg('get', '/quarterly-plans?year=2026&quarter=4'));
    const data = plan.data as {
      plan: { assignments: unknown[]; directions: unknown[]; epics: unknown[]; teams: Array<{ sprints: unknown[] }> };
      version: number;
    };
    expect(data.plan.teams).toHaveLength(2);
    expect(data.plan.teams[0]!.sprints).toHaveLength(7);
    expect(data.plan.teams[1]!.sprints).toHaveLength(8);
    expect(data.plan.directions.length).toBeGreaterThan(0);

    const emptyContent = { assignments: [], directions: [], epics: [], links: [], notes: [] };
    const put = (ifVersion: number) =>
      handleDemoFixtureRequest(
        cfg('put', '/quarterly-plans', { data: { content: emptyContent, ifVersion, quarter: 4, year: 2026 } })
      );
    expect(put(data.version)).toEqual({ data: { version: data.version + 1 }, status: 200 });
    // Тот же ifVersion второй раз — план уже сохранили, конфликт (QS5).
    expect(put(data.version).status).toBe(409);
    const saved = handleDemoFixtureRequest(cfg('get', '/quarterly-plans?year=2026&quarter=4'));
    expect((saved.data as typeof data).plan.directions).toEqual([]);
    expect((saved.data as typeof data).version).toBe(data.version + 1);

    const empty = handleDemoFixtureRequest(cfg('get', '/quarterly-plans?year=2027&quarter=1'));
    expect((empty.data as typeof data).plan.epics).toEqual([]);

    const created = handleDemoFixtureRequest(
      cfg('post', '/quarterly-plans/availability/board-events', {
        data: {
          boardId: DEMO_BOARD_ID,
          endDate: '2026-12-04',
          eventType: 'vacation',
          memberId: DEMO_DEV_CAROL,
          memberName: 'Carol',
          startDate: '2026-11-30',
        },
      })
    ).data as { id: string };
    const listEvents = () =>
      (
        handleDemoFixtureRequest(
          cfg('get', `/quarterly-plans/availability/board-events?boardId=${DEMO_BOARD_ID}`)
        ).data as { events: Array<{ id: string }> }
      ).events.map((event) => event.id);
    expect(listEvents()).toContain(created.id);

    handleDemoFixtureRequest(
      cfg('delete', `/quarterly-plans/availability/board-events?id=${created.id}&boardId=${DEMO_BOARD_ID}`)
    );
    expect(listEvents()).not.toContain(created.id);
  });

  it('returns swimlane fact changelogs keyed by issue', () => {
    const result = handleDemoFixtureRequest(cfg('post', '/issues/changelog'));
    expect(result.status).toBe(200);
    const data = result.data as Record<string, { changelog: unknown[] }>;
    expect(data['DEMO-102']?.changelog.length).toBeGreaterThan(1);
    expect(data['DEMO-104']?.changelog.length).toBeGreaterThan(1);
  });

  it('returns the created tracker link so the planner keeps the arrow', () => {
    const result = handleDemoFixtureRequest(
      cfg('post', '/issues/DEMO-101/links', {
        data: JSON.stringify({ relationship: 'relates', targetIssueKey: 'DEMO-103' }),
      })
    );
    expect(result.status).toBe(200);
    expect(result.data).toEqual({
      link: expect.objectContaining({ id: expect.any(String), linkedIssueKey: 'DEMO-103', relationship: 'relates' }),
    });
  });

  it('returns assignee velocity averages for demo developers', () => {
    const result = handleDemoFixtureRequest(
      cfg('get', `/sprints/assignee-velocity?sprintIds=${DEMO_SPRINT_ID}`)
    );
    expect(result.status).toBe(200);
    expect(result.data).toEqual(
      expect.objectContaining({
        sprintCount: 3,
        byAssignee: expect.objectContaining({
          [DEMO_DEV_ALICE]: expect.objectContaining({ averageSp: expect.any(Number) }),
        }),
      })
    );
  });

  it('serves plan anchors with positions for the delayed demo assignee', () => {
    const result = handleDemoFixtureRequest(cfg('get', `/sprints/${DEMO_SPRINT_ID}/positions`));
    const data = result.data as { planAnchors: Array<{ taskId: string }> };
    expect(data.planAnchors.map((anchor) => anchor.taskId)).toEqual([
      'DEMO-109',
      'DEMO-110',
      'DEMO-112',
    ]);
  });

  it('offers workflow transitions and applies the chosen one to the sprint tasks', () => {
    const transitions = handleDemoFixtureRequest(cfg('get', '/issues/DEMO-101/transitions'))
      .data as Array<{ id: string; to: { key: string } }>;
    expect(transitions.map((t) => t.to.key).slice(0, 4)).toEqual(['inReview', 'blocked', 'needInfo', 'open']);
    expect(transitions.length).toBeGreaterThan(10);

    const toReview = transitions.find((t) => t.to.key === 'inReview');
    const patched = handleDemoFixtureRequest(
      cfg('patch', '/issues/DEMO-101/status', { data: JSON.stringify({ transitionId: toReview?.id }) })
    );
    expect(patched.status).toBe(200);

    const tracker = handleDemoFixtureRequest(cfg('get', '/tracker'))
      .data as { tasks: Array<{ id: string; originalStatus?: string; status?: string }> };
    expect(tracker.tasks.find((t) => t.id === 'DEMO-101')).toEqual(
      expect.objectContaining({ originalStatus: 'inReview', status: 'in-progress' })
    );
  });

  it('rejects a transition that is not available from the current status', () => {
    const result = handleDemoFixtureRequest(
      cfg('patch', '/issues/DEMO-101/status', { data: { transitionId: 'demo-to-closed' } })
    );
    expect(result.status).toBe(409);
  });

  it('asks for fields on the transition to Blocked and finds people for them', () => {
    const fields = (
      handleDemoFixtureRequest(cfg('get', '/issues/DEMO-101/transitions/demo-to-blocked/fields')).data as {
        fields: Array<{ id: string; required: boolean; schemaType?: string }>;
      }
    ).fields;
    expect(fields.map((field) => field.id)).toEqual(['comment', 'unblockedBy', 'followers', 'expectedBy']);
    expect(fields.filter((field) => field.required).map((field) => field.id)).toEqual(['comment']);

    const found = (
      handleDemoFixtureRequest(cfg('get', '/users/search?q=grace')).data as {
        items: Array<{ displayName: string; trackerId: string }>;
      }
    ).items;
    expect(found.map((user) => user.displayName)).toEqual(['Grace Hopper']);
    const byId = handleDemoFixtureRequest(cfg('get', `/users/${found[0]!.trackerId}`)).data as { displayName: string };
    expect(byId.displayName).toBe('Grace Hopper');
  });

  it('returns no required fields for demo transitions without a screen', () => {
    const result = handleDemoFixtureRequest(cfg('get', '/issues/DEMO-101/transitions/demo-to-inReview/fields'));
    expect(result.data).toEqual({ fields: [] });
  });

  it('moves a task to the next sprint and back to the backlog', () => {
    const trackerTaskIds = (sprintId: number) =>
      (
        handleDemoFixtureRequest(cfg('get', '/tracker', { params: { sprintId } })).data as {
          tasks: Array<{ id: string }>;
        }
      ).tasks.map((t) => t.id);
    const backlogTaskIds = () =>
      (handleDemoFixtureRequest(cfg('get', '/backlog')).data as { tasks: Array<{ id: string }> }).tasks.map(
        (t) => t.id
      );

    expect(trackerTaskIds(DEMO_SPRINT_NEXT_ID)).toEqual([]);

    const moved = handleDemoFixtureRequest(
      cfg('post', '/issues/DEMO-101/sprint', { data: JSON.stringify({ sprintId: DEMO_SPRINT_NEXT_ID }) })
    );
    expect(moved.status).toBe(200);
    expect(trackerTaskIds(DEMO_SPRINT_NEXT_ID)).toEqual(['DEMO-101']);
    expect(trackerTaskIds(DEMO_SPRINT_ID)).not.toContain('DEMO-101');

    handleDemoFixtureRequest(cfg('delete', `/issues/DEMO-101/sprint?sprintId=${DEMO_SPRINT_NEXT_ID}`));
    expect(trackerTaskIds(DEMO_SPRINT_NEXT_ID)).toEqual([]);
    expect(backlogTaskIds()).toContain('DEMO-101');
  });

  it('lists the next sprint as a draft move target', () => {
    const sprints = handleDemoFixtureRequest(cfg('get', '/sprints')).data as Array<{
      id: number;
      status: string;
    }>;
    expect(sprints.find((s) => s.id === DEMO_SPRINT_NEXT_ID)?.status).toBe('draft');
  });
});

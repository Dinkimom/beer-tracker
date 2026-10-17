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
      events: [
        expect.objectContaining({
          endDate: '2026-10-14',
          eventType: 'vacation',
          memberId: DEMO_DEV_CAROL,
          startDate: '2026-10-13',
        }),
      ],
    });
  });

  it('returns swimlane fact changelogs keyed by issue', () => {
    const result = handleDemoFixtureRequest(cfg('post', '/issues/changelog'));
    expect(result.status).toBe(200);
    const data = result.data as Record<string, { changelog: unknown[] }>;
    expect(data['DEMO-102']?.changelog.length).toBeGreaterThan(1);
    expect(data['DEMO-104']?.changelog.length).toBeGreaterThan(1);
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
});

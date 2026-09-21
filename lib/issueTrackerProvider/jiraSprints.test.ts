import { describe, expect, it, vi } from 'vitest';

import {
  createJiraSprint,
  extractJiraSprintRows,
  fetchJiraSprintInfo,
  listJiraSprints,
  mapJiraSprintState,
  mapJiraSprintToPlannerListItem,
  mapPlannerStatusToJiraSprintState,
  updateJiraSprintStatus,
} from './jiraSprints';

const API_BASE = 'https://jira.example.com/rest/api/2';

function apiWith(methods: {
  get?: ReturnType<typeof vi.fn>;
  post?: ReturnType<typeof vi.fn>;
  put?: ReturnType<typeof vi.fn>;
}) {
  return {
    defaults: { baseURL: API_BASE },
    get: methods.get ?? vi.fn(),
    post: methods.post ?? vi.fn(),
    put: methods.put ?? vi.fn(),
  } as never;
}

function apiWithGet(get: ReturnType<typeof vi.fn>) {
  return apiWith({ get });
}

describe('mapJiraSprintState', () => {
  it('maps Agile states to planner statuses', () => {
    expect(mapJiraSprintState('active')).toEqual({ archived: false, status: 'in_progress' });
    expect(mapJiraSprintState('FUTURE')).toEqual({ archived: false, status: 'draft' });
    expect(mapJiraSprintState('closed')).toEqual({ archived: true, status: 'archived' });
  });
});

describe('mapPlannerStatusToJiraSprintState', () => {
  it('maps planner statuses onto Agile sprint states', () => {
    expect(mapPlannerStatusToJiraSprintState('in_progress')).toBe('active');
    expect(mapPlannerStatusToJiraSprintState('draft')).toBe('future');
    expect(mapPlannerStatusToJiraSprintState('archived')).toBe('closed');
    expect(mapPlannerStatusToJiraSprintState('released')).toBe('closed');
  });
});

describe('extractJiraSprintRows', () => {
  it('reads Agile values and GreenHopper sprints', () => {
    expect(extractJiraSprintRows({ values: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    expect(extractJiraSprintRows({ sprints: [{ id: 2 }] })).toEqual([{ id: 2 }]);
  });
});

describe('mapJiraSprintToPlannerListItem', () => {
  it('maps an Agile sprint onto the planner list contract', () => {
    expect(
      mapJiraSprintToPlannerListItem(
        {
          endDate: '2026-09-11T18:00:00.000+03:00',
          id: 55,
          name: 'Sprint 55',
          self: 'https://jira.example.com/rest/agile/1.0/sprint/55',
          startDate: '2026-08-31T09:00:00.000+03:00',
          state: 'active',
        },
        14684
      )
    ).toMatchObject({
      archived: false,
      board: { id: '14684' },
      endDate: '2026-09-11',
      id: 55,
      name: 'Sprint 55',
      startDate: '2026-08-31',
      status: 'in_progress',
      version: 1,
    });
  });
});

describe('fetchJiraSprintInfo', () => {
  it('GETs an Agile sprint and maps SprintInfo', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        endDate: '2026-09-11T18:00:00.000+03:00',
        id: 55,
        name: 'Sprint 55',
        startDate: '2026-08-31T09:00:00.000+03:00',
        state: 'active',
      },
    });
    await expect(fetchJiraSprintInfo(apiWithGet(get), 55)).resolves.toEqual({
      endDate: '2026-09-11',
      endDateTime: '2026-09-11T18:00:00.000+0300',
      id: 55,
      name: 'Sprint 55',
      startDate: '2026-08-31',
      startDateTime: '2026-08-31T09:00:00.000+0300',
      status: 'in_progress',
      version: 1,
    });
    expect(get).toHaveBeenCalledWith('https://jira.example.com/rest/agile/1.0/sprint/55');
  });
});

describe('updateJiraSprintStatus', () => {
  const current = {
    endDate: '2026-09-11T18:00:00.000+03:00',
    id: 83866,
    name: 'Sprint 83866',
    originBoardId: 14684,
    startDate: '2026-08-31T09:00:00.000+03:00',
    state: 'future',
  };
  const active = { ...current, state: 'active' };
  const closed = { ...current, state: 'closed' };
  const sprintUrl = 'https://jira.example.com/rest/agile/1.0/sprint/83866';
  const startUrl = 'https://jira.example.com/rest/greenhopper/1.0/sprint/83866/start';
  const completeUrl = 'https://jira.example.com/rest/greenhopper/1.0/sprint/83866/complete';
  const writeBody = {
    endDate: '2026-09-11T18:00:00.000+03:00',
    id: 83866,
    name: 'Sprint 83866',
    originBoardId: 14684,
    startDate: '2026-08-31T09:00:00.000+03:00',
    state: 'active',
  };

  function getMock(byId: () => unknown, boardValues: () => unknown[] = () => []) {
    return vi.fn((url: string) => {
      if (String(url).includes('/board/')) {
        return Promise.resolve({ data: { isLast: true, values: boardValues() } });
      }
      return Promise.resolve({ data: byId() });
    });
  }

  it('starts a future sprint via GreenHopper', async () => {
    let snapshot: unknown = current;
    const get = getMock(() => snapshot);
    const put = vi.fn().mockImplementation(() => {
      snapshot = active;
      return Promise.resolve({ data: undefined });
    });
    const post = vi.fn();
    await expect(updateJiraSprintStatus(apiWith({ get, post, put }), 83866, 'in_progress')).resolves.toMatchObject({
      boardId: 14684,
      id: 83866,
      status: 'in_progress',
    });
    expect(put).toHaveBeenCalledWith(startUrl, {
      endDate: current.endDate,
      name: current.name,
      rapidViewId: 14684,
      startDate: current.startDate,
    });
    expect(post).not.toHaveBeenCalled();
  });

  it('completes an active sprint via GreenHopper then Agile', async () => {
    let snapshot: unknown = active;
    const get = getMock(() => snapshot);
    const put = vi.fn().mockImplementation(() => {
      snapshot = closed;
      return Promise.resolve({ data: undefined });
    });
    await expect(updateJiraSprintStatus(apiWith({ get, put }), 83866, 'archived')).resolves.toMatchObject({
      status: 'archived',
    });
    expect(put).toHaveBeenCalledWith(completeUrl, {
      rapidViewId: 14684,
      sprintId: 83866,
    });
    expect(put).toHaveBeenCalledWith(
      sprintUrl,
      expect.objectContaining({
        completeDate: expect.any(String),
        id: 83866,
        state: 'closed',
      })
    );
  });

  it('throws when GET-by-id looks closed but the board still lists the sprint as active', async () => {
    let byId: unknown = active;
    const get = getMock(
      () => byId,
      () => [active]
    );
    const put = vi.fn().mockImplementation(() => {
      byId = closed;
      return Promise.resolve({ data: undefined });
    });
    await expect(updateJiraSprintStatus(apiWith({ get, put }), 83866, 'archived')).rejects.toThrow(
      'Jira did not accept sprint 83866 state closed'
    );
  });

  it('does not skip close when GET-by-id is already closed but the board is not', async () => {
    const get = getMock(
      () => closed,
      () => [active]
    );
    const put = vi.fn().mockResolvedValue({ data: undefined });
    await expect(updateJiraSprintStatus(apiWith({ get, put }), 83866, 'archived')).rejects.toThrow(
      'Jira did not accept sprint 83866 state closed'
    );
    expect(put).toHaveBeenCalled();
  });

  it('falls back to Agile when GreenHopper start returns 500', async () => {
    let snapshot: unknown = current;
    const get = getMock(() => snapshot);
    const put = vi
      .fn()
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockImplementation(() => {
        snapshot = active;
        return Promise.resolve({ data: undefined });
      });
    const post = vi.fn();
    await expect(updateJiraSprintStatus(apiWith({ get, post, put }), 83866, 'in_progress')).resolves.toMatchObject({
      status: 'in_progress',
    });
    expect(put).toHaveBeenNthCalledWith(2, sprintUrl, writeBody);
    expect(post).not.toHaveBeenCalled();
  });

  it('falls back to Agile POST when GreenHopper and PUT are not allowed', async () => {
    let snapshot: unknown = current;
    const get = getMock(() => snapshot);
    const put = vi.fn().mockRejectedValue({ response: { status: 405 } });
    const post = vi.fn().mockImplementation(() => {
      snapshot = active;
      return Promise.resolve({ data: undefined });
    });
    await expect(updateJiraSprintStatus(apiWith({ get, post, put }), 83866, 'in_progress')).resolves.toMatchObject({
      status: 'in_progress',
    });
    expect(post).toHaveBeenCalledWith(sprintUrl, writeBody);
  });

  it('throws when Jira does not keep the new state', async () => {
    const get = getMock(() => current);
    const put = vi.fn().mockResolvedValue({ data: undefined });
    const post = vi.fn().mockResolvedValue({ data: undefined });
    await expect(updateJiraSprintStatus(apiWith({ get, post, put }), 83866, 'in_progress')).rejects.toThrow(
      'Jira did not accept sprint 83866 state active'
    );
  });

  it('skips writes when the sprint is already in the target state', async () => {
    const get = getMock(() => ({
      id: 83866,
      name: 'Sprint 83866',
      originBoardId: 14684,
      state: 'active',
    }));
    const post = vi.fn();
    const put = vi.fn();
    await expect(updateJiraSprintStatus(apiWith({ get, post, put }), 83866, 'in_progress')).resolves.toMatchObject({
      id: 83866,
      status: 'in_progress',
    });
    expect(put).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });
});

describe('listJiraSprints', () => {
  it('loads Agile board sprints and maps them', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        isLast: true,
        values: [{ id: 55, name: 'Sprint 55', state: 'active' }],
      },
    });
    const sprints = await listJiraSprints(apiWithGet(get), 14684);
    expect(get).toHaveBeenCalledWith('https://jira.example.com/rest/agile/1.0/board/14684/sprint', {
      params: { maxResults: 50, startAt: 0, state: 'active,closed,future' },
    });
    expect(sprints).toEqual([
      expect.objectContaining({ id: 55, name: 'Sprint 55', status: 'in_progress' }),
    ]);
  });

  it('falls back to GreenHopper sprintquery when Agile is empty', async () => {
    const get = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/rest/agile/')) {
        return Promise.resolve({ data: { isLast: true, values: [] } });
      }
      return Promise.resolve({
        data: { sprints: [{ id: 9, name: 'GH', state: 'FUTURE' }] },
      });
    });
    const sprints = await listJiraSprints(apiWithGet(get), 14684);
    expect(get).toHaveBeenCalledWith(
      'https://jira.example.com/rest/greenhopper/1.0/sprintquery/14684',
      { params: { includeFutureSprints: true, includeHistoricSprints: true } }
    );
    expect(sprints).toEqual([expect.objectContaining({ id: 9, status: 'draft' })]);
  });
});

describe('createJiraSprint', () => {
  it('posts an Agile sprint and maps the planner list item', async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        endDate: '2026-09-17T23:59:59.000+00:00',
        id: 99,
        name: 'Booking 13',
        self: 'https://jira.example.com/rest/agile/1.0/sprint/99',
        startDate: '2026-09-03T00:00:00.000+00:00',
        state: 'future',
      },
    });
    await expect(
      createJiraSprint(apiWith({ post }), {
        boardId: 15116,
        endDate: '2026-09-17',
        name: 'Booking 13',
        startDate: '2026-09-03',
      })
    ).resolves.toMatchObject({
      board: { id: '15116' },
      endDate: '2026-09-17',
      id: 99,
      name: 'Booking 13',
      startDate: '2026-09-03',
      status: 'draft',
    });
    expect(post).toHaveBeenCalledWith('https://jira.example.com/rest/agile/1.0/sprint', {
      endDate: '2026-09-17T23:59:59.000+00:00',
      name: 'Booking 13',
      originBoardId: 15116,
      startDate: '2026-09-03T00:00:00.000+00:00',
    });
  });

  it('rejects missing name or board id', async () => {
    const post = vi.fn();
    await expect(
      createJiraSprint(apiWith({ post }), {
        boardId: 0,
        endDate: '2026-09-17',
        name: '  ',
        startDate: '2026-09-03',
      })
    ).rejects.toThrow('Jira createSprint requires name and positive board id');
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects a create response without a sprint id', async () => {
    const post = vi.fn().mockResolvedValue({ data: { name: 'Broken' } });
    await expect(
      createJiraSprint(apiWith({ post }), {
        boardId: 15116,
        endDate: '2026-09-17',
        name: 'Broken',
        startDate: '2026-09-03',
      })
    ).rejects.toThrow('Jira createSprint returned no sprint id');
  });
});

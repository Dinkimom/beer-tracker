import type { SprintListItem } from '@/types/tracker';

import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { patchSprintInSprintsQueries, sprintsQueryKey } from './useSprints';

function sprint(overrides: Partial<SprintListItem>): SprintListItem {
  return {
    archived: false,
    board: { display: 'Board', id: '1', self: '' },
    createdAt: '',
    createdBy: { cloudUid: '', display: '', id: '', passportUid: 0, self: '' },
    endDate: '2026-05-14',
    endDateTime: '2026-05-14T00:00:00.000+0000',
    id: 5,
    name: 'Sprint 5',
    self: '',
    startDate: '2026-05-01',
    startDateTime: '2026-05-01T00:00:00.000+0000',
    status: 'draft',
    version: 1,
    ...overrides,
  };
}

describe('sprintsQueryKey', () => {
  it('uses a demo-prefixed key on the demo planner', () => {
    expect(sprintsQueryKey(12, true)).toEqual(['sprints', 'demo', 12]);
  });

  it('uses the product key by default', () => {
    expect(sprintsQueryKey(12)).toEqual(['sprints', 12]);
  });
});

describe('patchSprintInSprintsQueries', () => {
  it('обновляет найденный спринт во всех списках спринтов', () => {
    const qc = new QueryClient();
    qc.setQueryData(['sprints', 1], [sprint({ id: 5 }), sprint({ id: 6, name: 'Sprint 6' })]);
    qc.setQueryData(['sprints', 'demo', 1], [sprint({ id: 5 })]);

    patchSprintInSprintsQueries(qc, {
      id: 5,
      name: 'Sprint 5',
      status: 'archived',
      startDate: '2026-05-01',
      startDateTime: '2026-05-01T00:00:00.000+0000',
      endDate: '2026-05-14',
      endDateTime: '2026-05-14T00:00:00.000+0000',
      version: 2,
    });

    const regular = qc.getQueryData<SprintListItem[]>(['sprints', 1]);
    const demo = qc.getQueryData<SprintListItem[]>(['sprints', 'demo', 1]);

    expect(regular?.find((item) => item.id === 5)).toMatchObject({
      archived: true,
      status: 'archived',
      version: 2,
    });
    expect(regular?.find((item) => item.id === 6)?.status).toBe('draft');
    expect(demo?.[0]).toMatchObject({
      archived: true,
      status: 'archived',
      version: 2,
    });
  });
});

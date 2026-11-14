import type * as Repository from './boardAvailabilityEventsRepository';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { notifyAvailabilityChangedIfNeeded } from '@/lib/notifications/notifyLifecycleAndAvailability';

import { applyAvailabilityEventOps, AvailabilityEventOpsSchema } from './boardAvailabilityEventOps';
import {
  deleteBoardAvailabilityEvent,
  insertBoardAvailabilityEvent,
  updateBoardAvailabilityEvent,
} from './boardAvailabilityEventsRepository';

vi.mock('@/lib/notifications/notifyLifecycleAndAvailability', () => ({
  notifyAvailabilityChangedIfNeeded: vi.fn(),
}));
vi.mock('./boardAvailabilityEventsRepository', async (importOriginal) => ({
  ...(await importOriginal<typeof Repository>()),
  deleteBoardAvailabilityEvent: vi.fn(),
  insertBoardAvailabilityEvent: vi.fn(),
  updateBoardAvailabilityEvent: vi.fn(),
}));

const teams = [{ boardId: 42, id: 't1', members: [{ id: 'alice', name: 'Alice' }] }];
const vacation = {
  endDate: '2026-11-27',
  eventType: 'vacation',
  memberId: 'alice',
  op: 'add',
  startDate: '2026-11-16',
  teamId: 't1',
} as const;

function row(id: string) {
  return {
    end_date: '2026-11-27',
    event_type: 'vacation',
    id,
    member_id: 'alice',
    member_name: 'Alice',
    start_date: '2026-11-16',
    tech_sprint_type: null,
  };
}

function run(ops: Parameters<typeof applyAvailabilityEventOps>[0]['ops']) {
  return applyAvailabilityEventOps({ actorUserId: 'u1', ops, organizationId: 'org-1', teams });
}

describe('applyAvailabilityEventOps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('пишет событие на доску команды с именем человека и уведомляет команду (QM7)', async () => {
    vi.mocked(insertBoardAvailabilityEvent).mockResolvedValue(row('ev1'));
    const result = await run([vacation]);
    expect(result.ok && result.applied.map((item) => item.id)).toEqual(['ev1']);
    expect(insertBoardAvailabilityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ boardId: 42, memberName: 'Alice', techSprintSubtype: null })
    );
    expect(notifyAvailabilityChangedIfNeeded).toHaveBeenCalledWith(expect.objectContaining({ boardId: 42 }));
  });

  it('не пишет событие чужой команды или человека не из команды', async () => {
    await expect(run([{ ...vacation, teamId: 't9' }])).resolves.toMatchObject({ error: 'unknown team t9', opIndex: 0 });
    await expect(run([{ ...vacation, memberId: 'mallory' }])).resolves.toMatchObject({
      error: 'member mallory is not in team t1',
    });
    expect(insertBoardAvailabilityEvent).not.toHaveBeenCalled();
  });

  it('проверяет даты и подвид техспринта', async () => {
    await expect(run([{ ...vacation, endDate: '2026-11-01' }])).resolves.toMatchObject({
      error: 'endDate must not be before startDate',
    });
    await expect(run([{ ...vacation, eventType: 'tech_sprint' }])).resolves.toMatchObject({
      error: 'tech_sprint needs techSprintSubtype',
    });
  });

  it('останавливается на первой ошибке, сделанное до неё остаётся', async () => {
    vi.mocked(insertBoardAvailabilityEvent).mockResolvedValue(row('ev1'));
    vi.mocked(updateBoardAvailabilityEvent).mockResolvedValue(null);
    const result = await run([vacation, { ...vacation, id: 'gone', op: 'update' }, vacation]);
    expect(result).toMatchObject({ applied: [{ id: 'ev1', op: 'add' }], ok: false, opIndex: 1 });
    expect(insertBoardAvailabilityEvent).toHaveBeenCalledTimes(1);
  });

  it('удаляет только событие этого человека на доске команды', async () => {
    vi.mocked(deleteBoardAvailabilityEvent).mockResolvedValue(1);
    await expect(run([{ id: 'ev1', memberId: 'alice', op: 'remove', teamId: 't1' }])).resolves.toEqual({
      applied: [{ id: 'ev1', op: 'remove' }],
      ok: true,
    });
    expect(deleteBoardAvailabilityEvent).toHaveBeenCalledWith('ev1', 42, 'alice');
  });

  it('схема отклоняет неизвестный вид отсутствия', () => {
    expect(AvailabilityEventOpsSchema.safeParse([{ ...vacation, eventType: 'holiday' }]).success).toBe(false);
  });
});

import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requireTenantContext } from '@/lib/api-tenant';
import {
  deleteBoardAvailabilityEvent,
  insertBoardAvailabilityEvent,
  listBoardAvailabilityEvents,
} from '@/lib/boardAvailability/boardAvailabilityEventsRepository';
import { getTeamByBoardId } from '@/lib/staffTeams/teamsRepository';

import { DELETE, GET, POST } from './route';

vi.mock('@/lib/api-tenant', () => ({ requireTenantContext: vi.fn() }));
vi.mock('@/lib/staffTeams/teamsRepository', () => ({ getTeamByBoardId: vi.fn() }));
vi.mock('@/lib/notifications/notifyLifecycleAndAvailability', () => ({ notifyAvailabilityChangedIfNeeded: vi.fn() }));
vi.mock('@/lib/boardAvailability/boardAvailabilityEventsRepository', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  deleteBoardAvailabilityEvent: vi.fn(),
  insertBoardAvailabilityEvent: vi.fn(),
  listBoardAvailabilityEvents: vi.fn(),
  updateBoardAvailabilityEvent: vi.fn(),
}));

const ctx = { organizationId: 'org-1', role: 'member', userId: 'user-1' } as const;
const url = 'http://localhost/api/quarterly-plans/availability/board-events';
const event = {
  boardId: 42,
  endDate: '2026-11-20',
  eventType: 'vacation',
  memberId: 'alice',
  memberName: 'Alice',
  startDate: '2026-11-16',
};

describe('board-events route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireTenantContext).mockResolvedValue({ ctx, profile: {} as never });
  });

  it('без сессии организации ничего не читает и не удаляет', async () => {
    const denied = NextResponse.json({ error: 'nope' }, { status: 401 });
    vi.mocked(requireTenantContext).mockResolvedValue({ response: denied });
    const get = await GET(new NextRequest(`${url}?boardId=42`));
    const del = await DELETE(new NextRequest(`${url}?id=e1&boardId=42&memberId=alice`, { method: 'DELETE' }));
    expect([get.status, del.status]).toEqual([401, 401]);
    expect(listBoardAvailabilityEvents).not.toHaveBeenCalled();
    expect(deleteBoardAvailabilityEvent).not.toHaveBeenCalled();
  });

  it('доска чужой организации — 404, события не читаются, не пишутся и не удаляются', async () => {
    vi.mocked(getTeamByBoardId).mockResolvedValue(null);
    const get = await GET(new NextRequest(`${url}?boardId=42`));
    const post = await POST(new NextRequest(url, { body: JSON.stringify(event), method: 'POST' }));
    const del = await DELETE(new NextRequest(`${url}?id=e1&boardId=42&memberId=alice`, { method: 'DELETE' }));
    expect([get.status, post.status, del.status]).toEqual([404, 404, 404]);
    expect(getTeamByBoardId).toHaveBeenCalledWith('org-1', 42);
    expect(listBoardAvailabilityEvents).not.toHaveBeenCalled();
    expect(insertBoardAvailabilityEvent).not.toHaveBeenCalled();
    expect(deleteBoardAvailabilityEvent).not.toHaveBeenCalled();
  });

  it('своя доска — запросы идут по паре (организация, доска)', async () => {
    vi.mocked(getTeamByBoardId).mockResolvedValue({ id: 't1' } as never);
    vi.mocked(listBoardAvailabilityEvents).mockResolvedValue([]);
    vi.mocked(deleteBoardAvailabilityEvent).mockResolvedValue(1);
    await GET(new NextRequest(`${url}?boardId=42`));
    await DELETE(new NextRequest(`${url}?id=e1&boardId=42&memberId=alice`, { method: 'DELETE' }));
    expect(listBoardAvailabilityEvents).toHaveBeenCalledWith('org-1', 42, null);
    expect(deleteBoardAvailabilityEvent).toHaveBeenCalledWith('org-1', 'e1', 42, 'alice');
  });
});

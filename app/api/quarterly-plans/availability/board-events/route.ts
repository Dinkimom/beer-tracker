import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext, type TenantContext } from '@/lib/api-tenant';
import {
  boardAvailabilityEventFromRow as rowToEvent,
  deleteBoardAvailabilityEvent,
  insertBoardAvailabilityEvent,
  listBoardAvailabilityEvents,
  updateBoardAvailabilityEvent,
} from '@/lib/boardAvailability/boardAvailabilityEventsRepository';
import { notifyAvailabilityChangedIfNeeded } from '@/lib/notifications/notifyLifecycleAndAvailability';
import { getTeamByBoardId } from '@/lib/staffTeams/teamsRepository';

const EVENT_TYPES = new Set(['vacation', 'sick_leave', 'duty']);

type OrgBoard = { boardId: number; ctx: TenantContext } | { response: NextResponse };

/**
 * Организация из сессии и её доска. Доска чужой организации — 404, как несуществующая:
 * номер доски уникален только внутри организации, события читаются и меняются только у своей.
 */
async function requireOrgBoard(request: NextRequest, boardIdRaw: unknown): Promise<OrgBoard> {
  const tenant = await requireTenantContext(request);
  if (!('ctx' in tenant)) {
    return { response: tenant.response };
  }
  const boardId = Number(boardIdRaw);
  if (boardIdRaw == null || boardIdRaw === '' || Number.isNaN(boardId)) {
    return { response: NextResponse.json({ error: 'Некорректный boardId' }, { status: 400 }) };
  }
  if (!(await getTeamByBoardId(tenant.ctx.organizationId, boardId))) {
    return { response: NextResponse.json({ error: 'Доска не найдена' }, { status: 404 }) };
  }
  return { boardId, ctx: tenant.ctx };
}

/** Новое или изменённое событие уходит в уведомления команды. */
function notifyChange(
  ctx: TenantContext,
  boardId: number,
  event: { endDate: string; eventType: string; memberId: string; memberName: string; startDate: string },
  sprintIdRaw: unknown
): void {
  const sprintId = sprintIdRaw != null && !Number.isNaN(Number(sprintIdRaw)) ? Number(sprintIdRaw) : undefined;
  notifyAvailabilityChangedIfNeeded({
    actorUserId: ctx.userId,
    endDate: event.endDate,
    eventType: event.eventType,
    memberId: event.memberId,
    memberName: event.memberName,
    startDate: event.startDate,
    boardId,
    organizationId: ctx.organizationId,
    sprintId,
  });
}

function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return null;
  }
  return d;
}

function validateEventPayload(body: Record<string, unknown>): {
  ok: false;
  response: NextResponse;
} | {
  ok: true;
  boardIdNum: number;
  memberId: string;
  memberName: string;
  startDate: string;
  endDate: string;
  eventType: string;
} {
  const boardId = body.boardId;
  const memberId = body.memberId;
  const memberName = body.memberName;
  const startDate = body.startDate;
  const endDate = body.endDate;
  const eventType = body.eventType ?? body.event_type;

  if (
    boardId == null ||
    memberId == null ||
    memberName == null ||
    startDate == null ||
    endDate == null ||
    eventType == null
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            'boardId, memberId, memberName, startDate, endDate, eventType обязательны',
        },
        { status: 400 }
      ),
    };
  }

  const boardIdNum = Number(boardId);
  if (Number.isNaN(boardIdNum)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Некорректные параметры' }, { status: 400 }),
    };
  }

  const et = String(eventType);
  if (!EVENT_TYPES.has(et)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Некорректный eventType' }, { status: 400 }),
    };
  }

  const start = parseDateOnly(String(startDate));
  const end = parseDateOnly(String(endDate));
  if (!start || !end) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Некорректный формат даты (ожидается YYYY-MM-DD)' },
        { status: 400 }
      ),
    };
  }
  if (end.getTime() < start.getTime()) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'endDate должна быть >= startDate' }, { status: 400 }),
    };
  }

  return {
    ok: true,
    boardIdNum,
    memberId: String(memberId),
    memberName: String(memberName),
    startDate: String(startDate),
    endDate: String(endDate),
    eventType: et,
  };
}

/**
 * GET /api/quarterly-plans/availability/board-events?boardId=&memberId=
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const access = await requireOrgBoard(request, searchParams.get('boardId'));
    if ('response' in access) return access.response;

    const rows = await listBoardAvailabilityEvents(
      access.ctx.organizationId,
      access.boardId,
      searchParams.get('memberId')
    );
    return NextResponse.json({ events: rows.map((row) => rowToEvent(row)) });
  } catch (error) {
    return handleApiError(error, 'Failed to get board availability events');
  }
}

/**
 * POST /api/quarterly-plans/availability/board-events
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) ?? {};
    const access = await requireOrgBoard(request, body.boardId);
    if ('response' in access) return access.response;
    const parsed = validateEventPayload(body);
    if (!parsed.ok) return parsed.response;

    const row = await insertBoardAvailabilityEvent({
      boardId: access.boardId,
      endDate: parsed.endDate,
      eventType: parsed.eventType,
      memberId: parsed.memberId,
      memberName: parsed.memberName,
      organizationId: access.ctx.organizationId,
      startDate: parsed.startDate,
    });
    notifyChange(access.ctx, access.boardId, parsed, body.sprintId);
    return NextResponse.json(rowToEvent(row));
  } catch (error) {
    return handleApiError(error, 'Failed to create board availability event');
  }
}

/**
 * PATCH /api/quarterly-plans/availability/board-events
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) ?? {};
    const access = await requireOrgBoard(request, body.boardId);
    if ('response' in access) return access.response;
    const { id, memberId } = body;
    if (!id || memberId == null) {
      return NextResponse.json({ error: 'id, boardId и memberId обязательны' }, { status: 400 });
    }
    const parsed = validateEventPayload(body);
    if (!parsed.ok) return parsed.response;

    const row = await updateBoardAvailabilityEvent({
      boardId: access.boardId,
      endDate: parsed.endDate,
      eventType: parsed.eventType,
      id,
      memberId: String(memberId),
      memberName: parsed.memberName,
      organizationId: access.ctx.organizationId,
      startDate: parsed.startDate,
    });
    if (!row) {
      return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 });
    }
    notifyChange(access.ctx, access.boardId, parsed, body.sprintId);
    return NextResponse.json(rowToEvent(row));
  } catch (error) {
    return handleApiError(error, 'Failed to update board availability event');
  }
}

/**
 * DELETE /api/quarterly-plans/availability/board-events?id=...&boardId=...&memberId=...
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const access = await requireOrgBoard(request, searchParams.get('boardId'));
    if ('response' in access) return access.response;
    const id = searchParams.get('id');
    const memberId = searchParams.get('memberId');
    if (!id || !memberId) {
      return NextResponse.json({ error: 'id, boardId и memberId обязательны' }, { status: 400 });
    }

    const deleted = await deleteBoardAvailabilityEvent(access.ctx.organizationId, id, access.boardId, memberId);
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    return handleApiError(error, 'Failed to delete board availability event');
  }
}

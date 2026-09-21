import { NextRequest, NextResponse } from 'next/server';

import { handleApiError } from '@/lib/api-error-handler';
import { requireTenantContext } from '@/lib/api-tenant';
import { notifyAvailabilityChangedIfNeeded } from '@/lib/notifications/notifyLifecycleAndAvailability';
import {
  deleteBoardAvailabilityEvent,
  insertBoardAvailabilityEvent,
  listBoardAvailabilityEvents,
  updateBoardAvailabilityEvent,
} from '@/lib/quarterlyPlans';

const EVENT_TYPES = new Set(['vacation', 'tech_sprint', 'sick_leave', 'duty']);
const TECH_SUBTYPES = new Set(['web', 'back', 'qa']);

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

function toIsoDateOnly(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function rowToEvent(row: {
  end_date: unknown;
  event_type: string;
  id: string;
  member_id: string;
  member_name: string;
  start_date: unknown;
  tech_sprint_type: string | null;
}) {
  const base = {
    id: row.id,
    memberId: row.member_id,
    memberName: row.member_name,
    startDate: toIsoDateOnly(row.start_date),
    endDate: toIsoDateOnly(row.end_date),
    eventType: row.event_type as 'duty' | 'sick_leave' | 'tech_sprint' | 'vacation',
  };
  if (row.event_type === 'tech_sprint' && row.tech_sprint_type) {
    return { ...base, techSprintSubtype: row.tech_sprint_type as 'back' | 'qa' | 'web' };
  }
  return base;
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
  techSprintSubtype: string | null;
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

  let techSprintSubtype: string | null = null;
  if (et === 'tech_sprint') {
    const sub = body.techSprintSubtype ?? body.tech_sprint_type;
    if (sub == null || !TECH_SUBTYPES.has(String(sub))) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Для tech_sprint нужен techSprintSubtype: web | back | qa' },
          { status: 400 }
        ),
      };
    }
    techSprintSubtype = String(sub);
  }

  return {
    ok: true,
    boardIdNum,
    memberId: String(memberId),
    memberName: String(memberName),
    startDate: String(startDate),
    endDate: String(endDate),
    eventType: et,
    techSprintSubtype,
  };
}

/**
 * GET /api/quarterly-plans/availability/board-events?boardId=&memberId=
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const boardIdParam = searchParams.get('boardId');
    const memberId = searchParams.get('memberId');

    if (!boardIdParam) {
      return NextResponse.json({ error: 'boardId обязателен' }, { status: 400 });
    }

    const boardId = Number(boardIdParam);
    if (Number.isNaN(boardId)) {
      return NextResponse.json({ error: 'Некорректные параметры' }, { status: 400 });
    }

    const rows = await listBoardAvailabilityEvents(boardId, memberId);
    const events = rows.map((row) => rowToEvent(row));

    return NextResponse.json({ events });
  } catch (error) {
    return handleApiError(error, 'Failed to get board availability events');
  }
}

/**
 * POST /api/quarterly-plans/availability/board-events
 */
export async function POST(request: NextRequest) {
  try {
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId, userId: actorUserId } = tenantResult.ctx;

    const body = (await request.json()) ?? {};
    const parsed = validateEventPayload(body);
    if (!parsed.ok) return parsed.response;

    const row = await insertBoardAvailabilityEvent({
      boardId: parsed.boardIdNum,
      memberId: parsed.memberId,
      memberName: parsed.memberName,
      eventType: parsed.eventType,
      techSprintSubtype: parsed.techSprintSubtype,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
    });

    const sprintIdRaw = body.sprintId;
    const sprintId =
      sprintIdRaw != null && !Number.isNaN(Number(sprintIdRaw)) ? Number(sprintIdRaw) : undefined;

    notifyAvailabilityChangedIfNeeded({
      actorUserId,
      boardId: parsed.boardIdNum,
      endDate: parsed.endDate,
      eventType: parsed.eventType,
      memberId: parsed.memberId,
      memberName: parsed.memberName,
      organizationId,
      sprintId,
      startDate: parsed.startDate,
    });

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
    const tenantResult = await requireTenantContext(request);
    if (!('ctx' in tenantResult)) {
      return tenantResult.response;
    }
    const { organizationId, userId: actorUserId } = tenantResult.ctx;

    const body = (await request.json()) ?? {};
    const { id, boardId, memberId } = body ?? {};

    if (!id || boardId == null || memberId == null) {
      return NextResponse.json(
        { error: 'id, boardId и memberId обязательны' },
        { status: 400 }
      );
    }

    const parsed = validateEventPayload(body);
    if (!parsed.ok) return parsed.response;

    const boardIdNum = Number(boardId);
    if (Number.isNaN(boardIdNum)) {
      return NextResponse.json({ error: 'Некорректные параметры' }, { status: 400 });
    }

    const row = await updateBoardAvailabilityEvent({
      id,
      boardId: boardIdNum,
      memberId: String(memberId),
      memberName: parsed.memberName,
      eventType: parsed.eventType,
      techSprintSubtype: parsed.techSprintSubtype,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
    });

    if (!row) {
      return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 });
    }

    const sprintIdRaw = body.sprintId;
    const sprintId =
      sprintIdRaw != null && !Number.isNaN(Number(sprintIdRaw)) ? Number(sprintIdRaw) : undefined;

    notifyAvailabilityChangedIfNeeded({
      actorUserId,
      boardId: boardIdNum,
      endDate: parsed.endDate,
      eventType: parsed.eventType,
      memberId: parsed.memberId,
      memberName: parsed.memberName,
      organizationId,
      sprintId,
      startDate: parsed.startDate,
    });

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
    const id = searchParams.get('id');
    const boardIdParam = searchParams.get('boardId');
    const memberId = searchParams.get('memberId');

    if (!id || !boardIdParam || !memberId) {
      return NextResponse.json(
        { error: 'id, boardId и memberId обязательны' },
        { status: 400 }
      );
    }

    const boardId = Number(boardIdParam);
    if (Number.isNaN(boardId)) {
      return NextResponse.json({ error: 'Некорректные параметры' }, { status: 400 });
    }

    const deleted = await deleteBoardAvailabilityEvent(id, boardId, memberId);

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    return handleApiError(error, 'Failed to delete board availability event');
  }
}

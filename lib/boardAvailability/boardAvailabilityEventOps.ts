/**
 * Отпуска, больничные и дежурства от агента (QM7): те же события, что пишет поповер доски
 * спринта (`board_availability_events`), поэтому они общие для спринта и квартала (QV1, QV3).
 */

import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { z } from 'zod';

import { notifyAvailabilityChangedIfNeeded } from '@/lib/notifications/notifyLifecycleAndAvailability';

import {
  boardAvailabilityEventFromRow,
  deleteBoardAvailabilityEvent,
  insertBoardAvailabilityEvent,
  updateBoardAvailabilityEvent,
} from './boardAvailabilityEventsRepository';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const eventFields = {
  endDate: isoDate,
  eventType: z.enum(['duty', 'sick_leave', 'vacation']),
  memberId: z.string().min(1).describe('Developer id from get_quarterly_plan teams[].members[].id'),
  startDate: isoDate,
  teamId: z.string().min(1).describe('teams[].id from get_quarterly_plan'),
};

export const AvailabilityEventOpsSchema = z
  .array(
    z.discriminatedUnion('op', [
      z.object({ op: z.literal('add'), ...eventFields }),
      z.object({ id: z.string().min(1), op: z.literal('update'), ...eventFields }),
      z.object({
        id: z.string().min(1),
        memberId: eventFields.memberId,
        op: z.literal('remove'),
        teamId: eventFields.teamId,
      }),
    ])
  )
  .min(1)
  .max(100);

type AvailabilityEventOp = z.infer<typeof AvailabilityEventOpsSchema>[number];

/** Команда организации: её доска и люди. По ним проверяется, что событие — про человека этой команды. */
interface AvailabilityTeam {
  boardId: number;
  id: string;
  members: ReadonlyArray<{ id: string; name: string }>;
}

type ApplyResult =
  | { applied: Array<{ event?: BoardAvailabilityEvent; id: string; op: AvailabilityEventOp['op'] }>; ok: true }
  | { applied: Array<{ id: string; op: AvailabilityEventOp['op'] }>; error: string; ok: false; opIndex: number };

/** Ошибка в данных события: команда, человек, даты, вид. */
function eventError(op: AvailabilityEventOp, team: AvailabilityTeam | undefined): string | null {
  if (!team) return `unknown team ${op.teamId}`;
  if (!team.members.some((member) => member.id === op.memberId)) {
    return `member ${op.memberId} is not in team ${op.teamId}`;
  }
  if (op.op === 'remove') return null;
  if (op.endDate < op.startDate) return 'endDate must not be before startDate';
  return null;
}

/** Одна операция; новое или изменённое событие уходит в уведомления команды, как из поповера доски. */
async function applyOne(
  op: AvailabilityEventOp,
  team: AvailabilityTeam,
  actor: { organizationId: string; userId: string }
): Promise<{ event?: BoardAvailabilityEvent; id: string } | null> {
  if (op.op === 'remove') {
    const deleted = await deleteBoardAvailabilityEvent(op.id, team.boardId, op.memberId);
    return deleted > 0 ? { id: op.id } : null;
  }
  const fields = {
    boardId: team.boardId,
    endDate: op.endDate,
    eventType: op.eventType,
    memberId: op.memberId,
    memberName: team.members.find((member) => member.id === op.memberId)?.name ?? op.memberId,
    startDate: op.startDate,
  };
  const row =
    op.op === 'add'
      ? await insertBoardAvailabilityEvent(fields)
      : await updateBoardAvailabilityEvent({ ...fields, id: op.id });
  if (!row) return null;
  const event = boardAvailabilityEventFromRow(row);
  notifyAvailabilityChangedIfNeeded({
    actorUserId: actor.userId,
    boardId: team.boardId,
    endDate: event.endDate,
    eventType: event.eventType,
    memberId: event.memberId,
    memberName: event.memberName,
    organizationId: actor.organizationId,
    startDate: event.startDate,
  });
  return { event, id: event.id };
}

/**
 * Применяет операции по порядку и останавливается на первой ошибке: уже сделанные остаются
 * (отдельные события, не один документ) и перечислены в `applied`.
 */
export async function applyAvailabilityEventOps(input: {
  actorUserId: string;
  ops: readonly AvailabilityEventOp[];
  organizationId: string;
  teams: readonly AvailabilityTeam[];
}): Promise<ApplyResult> {
  const applied: Array<{ event?: BoardAvailabilityEvent; id: string; op: AvailabilityEventOp['op'] }> = [];
  for (const [opIndex, op] of input.ops.entries()) {
    const team = input.teams.find((candidate) => candidate.id === op.teamId);
    const error = eventError(op, team);
    const result =
      error || !team
        ? null
        : await applyOne(op, team, { organizationId: input.organizationId, userId: input.actorUserId });
    if (!result) {
      const message = error ?? `${op.op}: event ${'id' in op ? op.id : ''} not found for this member and team`;
      return { applied, error: message, ok: false, opIndex };
    }
    applied.push({ ...result, op: op.op });
  }
  return { applied, ok: true };
}

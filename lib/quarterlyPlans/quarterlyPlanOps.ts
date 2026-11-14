/**
 * Пакет операций над квартальным планом — то, что агент делает через MCP (раздел 11 QUARTERLY_PLAN_RULES.md).
 * Чистые функции: план на входе, план на выходе. Правила — те же, что у доски (QM2), из `quarterlyPlanLayout`.
 */

import type { QuarterlyPlanContent, QuarterlyPlanNoteRow, QuarterRef } from './quarterlyPlanTypes';

import { z } from 'zod';

import { STICKY_NOTE_COLORS } from '@/lib/comments/stickyNoteColor';

import {
  addAssignment,
  addDirection,
  addEpic,
  addLink,
  addNote,
  areLinked,
  QUARTER_NOTE_MAX_ROWS,
  removeAssignment,
  removeDirection,
  removeEpic,
  removeLink,
  removeNote,
  updateAssignment,
  updateDirection,
  updateEpic,
  updateNote,
  type WeekSpan,
} from './quarterlyPlanLayout';
import { buildQuarterWeeks, resolveWeekSpan } from './quarterWeeks';

const MAX_OPS = 200;

/** Id сущности плана или `$имя` — ссылка на сущность, созданную раньше в том же пакете (QM1). */
const target = z.string().trim().min(1).max(80);
const ref = z
  .string()
  .regex(/^\$[\w-]{1,40}$/)
  .describe('Name for the created entity, e.g. "$epic1"; later ops in the same batch use it instead of an id');
const title = z.string().trim().min(1).max(300);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
/** Срок: неделями квартала или датами (QM3). */
const span = z.union([
  z.object({ startWeek: z.number().int().min(0), weeks: z.number().int().min(1) }),
  z.object({ endDate: isoDate, startDate: isoDate }),
]);
const status = z.enum(['backlog', 'blocked', 'done', 'in_progress', 'test']);
const noteRow = z.object({ id: target, kind: z.enum(['absence', 'direction', 'epic', 'team']) });

const QuarterlyPlanOpSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('addDirection'), ref: ref.optional(), teamId: target, title }),
  z.object({
    directionId: target,
    issue: z.object({ issueKey: z.string().trim().min(1).max(64), title }).optional(),
    op: z.literal('updateDirection'),
    title: title.optional(),
    unlink: z.literal(true).optional(),
  }),
  z.object({ directionId: target, op: z.literal('removeDirection') }),
  z.object({
    directionId: target,
    issueKey: z.string().trim().min(1).max(64).optional(),
    op: z.literal('addEpic'),
    ref: ref.optional(),
    status: status.optional(),
    title: title.optional(),
  }),
  z.object({
    epicId: target,
    issue: z.object({ issueKey: z.string().trim().min(1).max(64), title }).optional(),
    op: z.literal('updateEpic'),
    status: status.optional(),
    title: title.optional(),
    unlink: z.literal(true).optional(),
  }),
  z.object({ epicId: target, op: z.literal('removeEpic') }),
  z.object({ epicId: target, memberId: target, op: z.literal('assign'), ref: ref.optional(), span }),
  z.object({
    assignmentId: target,
    memberId: target.optional(),
    op: z.literal('updateAssignment'),
    span: span.optional(),
  }),
  z.object({ assignmentId: target, op: z.literal('removeAssignment') }),
  z.object({ fromId: target, op: z.literal('addLink'), ref: ref.optional(), toId: target }),
  z.object({ linkId: target, op: z.literal('removeLink') }),
  z.object({
    color: z.enum(STICKY_NOTE_COLORS).optional(),
    op: z.literal('addNote'),
    ref: ref.optional(),
    row: noteRow,
    rows: z.number().int().min(1).max(QUARTER_NOTE_MAX_ROWS).optional(),
    span,
    text: z.string().trim().min(1).max(5000),
  }),
  z.object({
    color: z.enum(STICKY_NOTE_COLORS).optional(),
    noteId: target,
    op: z.literal('updateNote'),
    row: noteRow.optional(),
    rows: z.number().int().min(1).max(QUARTER_NOTE_MAX_ROWS).optional(),
    span: span.optional(),
    text: z.string().trim().min(1).max(5000).optional(),
  }),
  z.object({ noteId: target, op: z.literal('removeNote') }),
]);

export const QuarterlyPlanOpsSchema = z.array(QuarterlyPlanOpSchema).min(1).max(MAX_OPS);

export type QuarterlyPlanOp = z.infer<typeof QuarterlyPlanOpSchema>;

/** Команды плана: по ним проверяются ссылки на команду и исполнитель эпика (QA3). */
interface QuarterlyPlanOpsTeams {
  /** id команды → id людей (`Developer.id`). */
  memberIdsByTeam: ReadonlyMap<string, ReadonlySet<string>>;
}

type ApplyQuarterlyPlanOpsResult =
  | { content: QuarterlyPlanContent; ok: true; refs: Record<string, string> }
  | { error: string; ok: false; opIndex: number };

class OpError extends Error {}

interface OpContext {
  /** `$имя` → id сущности, созданной раньше в пакете. */
  refs: Map<string, string>;
  teams: QuarterlyPlanOpsTeams;
  weekCount: number;
  weeks: ReturnType<typeof buildQuarterWeeks>;
  newId: () => string;
}

function resolveId(ctx: OpContext, id: string): string {
  if (!id.startsWith('$')) return id;
  const resolved = ctx.refs.get(id);
  if (!resolved) throw new OpError(`unknown ref ${id}`);
  return resolved;
}

function remember(ctx: OpContext, name: string | undefined, id: string): void {
  if (!name) return;
  if (ctx.refs.has(name)) throw new OpError(`ref ${name} is already used in this batch`);
  ctx.refs.set(name, id);
}

/** Срок в неделях квартала; даты переводятся по QW5. Целые недели в пределах квартала (QA1). */
function resolveSpan(ctx: OpContext, input: z.infer<typeof span>): WeekSpan {
  const weekSpan =
    'startWeek' in input ? input : resolveWeekSpan(ctx.weeks, input.startDate, input.endDate);
  if (!weekSpan) throw new OpError(`dates ${JSON.stringify(input)} do not touch the quarter's working days`);
  if (weekSpan.startWeek + weekSpan.weeks > ctx.weekCount) {
    throw new OpError(`weeks ${weekSpan.startWeek}+${weekSpan.weeks} are outside the quarter (${ctx.weekCount} weeks)`);
  }
  return { startWeek: weekSpan.startWeek, weeks: weekSpan.weeks };
}

function findOr<T extends { id: string }>(items: readonly T[], id: string, what: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new OpError(`unknown ${what} ${id}`);
  return item;
}

/** Исполнитель — из команды эпика (QA3). */
function requireTeamMember(ctx: OpContext, plan: QuarterlyPlanContent, epicId: string, memberId: string): void {
  const directionId = findOr(plan.epics, epicId, 'epic').directionId;
  const teamId = findOr(plan.directions, directionId, 'direction').teamId;
  if (!ctx.teams.memberIdsByTeam.get(teamId)?.has(memberId)) {
    throw new OpError(`member ${memberId} is not in the epic's team ${teamId}`);
  }
}

function requireRow(ctx: OpContext, plan: QuarterlyPlanContent, row: QuarterlyPlanNoteRow): QuarterlyPlanNoteRow {
  const id = resolveId(ctx, row.id);
  const exists = {
    absence: () => ctx.teams.memberIdsByTeam.has(id),
    direction: () => plan.directions.some((direction) => direction.id === id),
    epic: () => plan.epics.some((epic) => epic.id === id),
    team: () => ctx.teams.memberIdsByTeam.has(id),
  }[row.kind]();
  if (!exists) throw new OpError(`unknown ${row.kind} ${id}`);
  return { id, kind: row.kind };
}

/** Одна задача трекера — одна строка на план (QE4); ошибка называет строку, где она уже стоит (QM5). */
function requireIssueFree(plan: QuarterlyPlanContent, issueKey: string, exceptId?: string): void {
  const rows = [
    ...plan.directions.map((row) => ({ kind: 'direction', row })),
    ...plan.epics.map((row) => ({ kind: 'epic', row })),
  ];
  const taken = rows.find(({ row }) => row.issueKey === issueKey && row.id !== exceptId);
  if (taken) throw new OpError(`issue ${issueKey} is already in the plan as ${taken.kind} ${taken.row.id}`);
}

type Handlers = {
  [K in QuarterlyPlanOp['op']]: (
    plan: QuarterlyPlanContent,
    op: Extract<QuarterlyPlanOp, { op: K }>,
    ctx: OpContext
  ) => QuarterlyPlanContent;
};

const handlers: Handlers = {
  // Направление с тем же названием в команде уже есть — берём его: повторный перенос не плодит дубли (QM5).
  addDirection: (plan, op, ctx) => {
    const teamId = resolveId(ctx, op.teamId);
    if (!ctx.teams.memberIdsByTeam.has(teamId)) throw new OpError(`unknown team ${teamId}`);
    const existing = plan.directions.find(
      (direction) => direction.teamId === teamId && direction.title.toLowerCase() === op.title.toLowerCase()
    );
    const id = existing?.id ?? ctx.newId();
    remember(ctx, op.ref, id);
    return existing ? plan : addDirection(plan, { id, teamId, title: op.title });
  },
  // Направление привязывают к эпику трекера: название — из трекера (QE5).
  updateDirection: (plan, op, ctx) => {
    const directionId = findOr(plan.directions, resolveId(ctx, op.directionId), 'direction').id;
    if (op.issue && op.unlink) throw new OpError('issue and unlink exclude each other');
    if (op.issue) requireIssueFree(plan, op.issue.issueKey, directionId);
    return updateDirection(plan, directionId, {
      ...(op.title ? { title: op.title } : {}),
      ...(op.issue ? { issueKey: op.issue.issueKey, title: op.issue.title } : {}),
      ...(op.unlink ? { issueKey: undefined } : {}),
    });
  },
  removeDirection: (plan, op, ctx) =>
    removeDirection(plan, findOr(plan.directions, resolveId(ctx, op.directionId), 'direction').id),
  addEpic: (plan, op, ctx) => {
    const directionId = findOr(plan.directions, resolveId(ctx, op.directionId), 'direction').id;
    if (op.issueKey) requireIssueFree(plan, op.issueKey);
    const epicTitle = op.title ?? op.issueKey;
    if (!epicTitle) throw new OpError('epic needs a title or an issueKey');
    const id = ctx.newId();
    remember(ctx, op.ref, id);
    return addEpic(plan, {
      directionId,
      id,
      ...(op.issueKey ? { issueKey: op.issueKey } : {}),
      status: op.status ?? 'backlog',
      title: epicTitle,
    });
  },
  updateEpic: (plan, op, ctx) => {
    const epic = findOr(plan.epics, resolveId(ctx, op.epicId), 'epic');
    if (op.issue && op.unlink) throw new OpError('issue and unlink exclude each other');
    if (op.issue) requireIssueFree(plan, op.issue.issueKey, epic.id);
    const linked = op.unlink ? false : Boolean(op.issue ?? epic.issueKey);
    // Статус привязанного эпика — из трекера (QE7): вручную его не ставят.
    if (op.status && linked) throw new OpError(`epic ${epic.id} is linked to the tracker; its status comes from there`);
    const patch = {
      ...(op.title ? { title: op.title } : {}),
      ...(op.status ? { status: op.status } : {}),
      ...(op.issue ? { issueKey: op.issue.issueKey, title: op.issue.title } : {}),
      ...(op.unlink ? { issueKey: undefined, status: 'backlog' as const } : {}),
    };
    return updateEpic(plan, epic.id, patch);
  },
  removeEpic: (plan, op, ctx) => removeEpic(plan, findOr(plan.epics, resolveId(ctx, op.epicId), 'epic').id),
  assign: (plan, op, ctx) => {
    const epicId = findOr(plan.epics, resolveId(ctx, op.epicId), 'epic').id;
    requireTeamMember(ctx, plan, epicId, op.memberId);
    const id = ctx.newId();
    remember(ctx, op.ref, id);
    return addAssignment(plan, { epicId, id, memberId: op.memberId, ...resolveSpan(ctx, op.span) });
  },
  updateAssignment: (plan, op, ctx) => {
    const assignment = findOr(plan.assignments, resolveId(ctx, op.assignmentId), 'assignment');
    if (op.memberId) requireTeamMember(ctx, plan, assignment.epicId, op.memberId);
    return updateAssignment(plan, assignment.id, {
      ...(op.memberId ? { memberId: op.memberId } : {}),
      ...(op.span ? resolveSpan(ctx, op.span) : {}),
    });
  },
  removeAssignment: (plan, op, ctx) =>
    removeAssignment(plan, findOr(plan.assignments, resolveId(ctx, op.assignmentId), 'assignment').id),
  // Агент сам называет порядок: `from` должно закончиться раньше `to` (QL1); дубль и петля — ошибка (QL4).
  addLink: (plan, op, ctx) => {
    const fromId = findOr(plan.assignments, resolveId(ctx, op.fromId), 'assignment').id;
    const toId = findOr(plan.assignments, resolveId(ctx, op.toId), 'assignment').id;
    if (fromId === toId) throw new OpError('an assignment cannot wait for itself');
    if (areLinked(plan.links, fromId, toId)) throw new OpError(`assignments ${fromId} and ${toId} are already linked`);
    const id = ctx.newId();
    remember(ctx, op.ref, id);
    return addLink(plan, { fromId, id, toId });
  },
  removeLink: (plan, op, ctx) => removeLink(plan, findOr(plan.links, resolveId(ctx, op.linkId), 'link').id),
  addNote: (plan, op, ctx) => {
    const id = ctx.newId();
    const note = {
      color: op.color ?? 'yellow',
      id,
      row: requireRow(ctx, plan, op.row),
      rows: op.rows ?? 2,
      text: op.text,
      ...resolveSpan(ctx, op.span),
    };
    remember(ctx, op.ref, id);
    return addNote(plan, note);
  },
  updateNote: (plan, op, ctx) => {
    const noteId = findOr(plan.notes, resolveId(ctx, op.noteId), 'note').id;
    return updateNote(plan, noteId, {
      ...(op.color ? { color: op.color } : {}),
      ...(op.row ? { row: requireRow(ctx, plan, op.row) } : {}),
      ...(op.rows ? { rows: op.rows } : {}),
      ...(op.span ? resolveSpan(ctx, op.span) : {}),
      ...(op.text ? { text: op.text } : {}),
    });
  },
  removeNote: (plan, op, ctx) => removeNote(plan, findOr(plan.notes, resolveId(ctx, op.noteId), 'note').id),
};

function applyOp(plan: QuarterlyPlanContent, op: QuarterlyPlanOp, ctx: OpContext): QuarterlyPlanContent {
  const handler = handlers[op.op] as (
    plan: QuarterlyPlanContent,
    op: QuarterlyPlanOp,
    ctx: OpContext
  ) => QuarterlyPlanContent;
  return handler(plan, op, ctx);
}

/**
 * Применяет пакет целиком или не применяет вовсе (QM1): первая ошибка называет номер операции.
 * Люди — в форме клиента (`Developer.id`); план на выходе ещё проверяет сохранение (QS1).
 */
export function applyQuarterlyPlanOps(input: {
  content: QuarterlyPlanContent;
  newId?: () => string;
  ops: readonly QuarterlyPlanOp[];
  ref: QuarterRef;
  teams: QuarterlyPlanOpsTeams;
}): ApplyQuarterlyPlanOpsResult {
  const weeks = buildQuarterWeeks(input.ref);
  const ctx: OpContext = {
    newId: input.newId ?? (() => crypto.randomUUID()),
    refs: new Map(),
    teams: input.teams,
    weekCount: weeks.length,
    weeks,
  };
  let plan = input.content;
  for (const [opIndex, op] of input.ops.entries()) {
    try {
      plan = applyOp(plan, op, ctx);
    } catch (error) {
      if (error instanceof OpError) return { error: `${op.op}: ${error.message}`, ok: false, opIndex };
      throw error;
    }
  }
  return { content: plan, ok: true, refs: Object.fromEntries(ctx.refs) };
}

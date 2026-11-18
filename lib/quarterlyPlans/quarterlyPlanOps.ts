/**
 * Пакет операций над квартальным планом — то, что агент делает через MCP (раздел 11 QUARTERLY_PLAN_RULES.md).
 * Чистые функции: план на входе, план на выходе. Правила — те же, что у доски (QM2), из `quarterlyPlanLayout`.
 */

import type { QuarterlyPlanAssignment, QuarterlyPlanContent, QuarterlyPlanNoteRow, QuarterRef } from './quarterlyPlanTypes';

import { z } from 'zod';

import { STICKY_NOTE_COLORS } from '@/lib/comments/stickyNoteColor';
import { randomUuid } from '@/lib/randomUuid';

import {
  addAssignment,
  addDirection,
  addEpic,
  addLink,
  addNote,
  areLinked,
  assignmentSpanFields,
  directionIdOfAssignment,
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
import { estimateQuarterNoteRows } from './quarterlyPlanNoteSize';
import { moveDirection, moveEpic, moveEpicError } from './quarterlyPlanRows';
import { buildQuarterWeeks, resolveDaySpan, resolveWeekSpan } from './quarterWeeks';

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
const phase = z.enum(['delivery', 'discovery']);
const place = z.enum(['after', 'before']).describe('Where the row goes relative to anchorId');
const noteRow = z.object({ id: target, kind: z.enum(['absence', 'direction', 'epic', 'team']) });

const QuarterlyPlanOpSchema = z.discriminatedUnion('op', [
  z.object({
    afterId: target.optional().describe('Direction of the same team to put the new one right below; default: last'),
    op: z.literal('addDirection'),
    ref: ref.optional(),
    teamId: target,
    title,
  }),
  z.object({ anchorId: target, directionId: target, op: z.literal('moveDirection'), place }),
  z.object({
    directionId: target,
    issue: z.object({ issueKey: z.string().trim().min(1).max(64), title }).optional(),
    op: z.literal('updateDirection'),
    title: title.optional(),
    unlink: z.literal(true).optional(),
  }),
  z.object({ directionId: target, op: z.literal('removeDirection') }),
  z.object({
    afterId: target.optional().describe('Row of the same level and parent to put the new one right below; default: last'),
    directionId: target.optional().describe('Direction of a new epic; exactly one of directionId and parentEpicId'),
    issueKey: z.string().trim().min(1).max(64).optional(),
    op: z.literal('addEpic'),
    parentEpicId: target
      .optional()
      .describe('Epic to add a task under: a task is a row of its own with its own bars, one level below the epic'),
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
  z.object({
    anchorId: target.describe('Row of the same level: an epic for an epic, a task for a task'),
    epicId: target,
    op: z.literal('moveEpic'),
    place,
  }),
  z.object({
    directionId: target.optional().describe('Row is the direction itself (usually discovery); exactly one of epicId and directionId'),
    epicId: target.optional(),
    memberId: target,
    op: z.literal('assign'),
    phase: phase.optional().describe('Default: discovery on a direction, delivery on an epic'),
    ref: ref.optional(),
    span,
  }),
  z.object({
    assignmentId: target,
    memberId: target.optional(),
    op: z.literal('updateAssignment'),
    phase: phase.optional(),
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
  | { content: QuarterlyPlanContent; ok: true; refs: Record<string, string>; targets: (string | null)[] }
  | { error: string; ok: false; opIndex: number };

class OpError extends Error {}

interface OpContext {
  /** Сущность, которую создала текущая операция; null — не создавала (или взяла существующую). */
  created: string | null;
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

/** Операция создала сущность: её id — цель операции и, если есть `ref`, имя для следующих операций. */
function created(ctx: OpContext, name: string | undefined, id: string): void {
  remember(ctx, name, id);
  ctx.created = id;
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

/** Срок назначения (QT5): даты дают рабочие дни, недели — целые недели; прежние дни при этом снимаются. */
function resolveAssignmentSpan(
  ctx: OpContext,
  input: z.infer<typeof span>
): Pick<QuarterlyPlanAssignment, 'days' | 'startDay' | 'startWeek' | 'weeks'> {
  const weekSpan = resolveSpan(ctx, input);
  const daySpan = 'startDate' in input ? resolveDaySpan(ctx.weeks, input.startDate, input.endDate) : null;
  return daySpan ? assignmentSpanFields(daySpan) : { ...weekSpan, days: undefined, startDay: undefined };
}

function findOr<T extends { id: string }>(items: readonly T[], id: string, what: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new OpError(`unknown ${what} ${id}`);
  return item;
}

type AssignmentRow = Pick<QuarterlyPlanAssignment, 'directionId' | 'epicId'>;

/** Исполнитель — из команды строки: эпика или направления (QA3, QG2). */
function requireTeamMember(ctx: OpContext, plan: QuarterlyPlanContent, row: AssignmentRow, memberId: string): void {
  const directionId = directionIdOfAssignment(plan, row);
  const teamId = findOr(plan.directions, directionId ?? '', 'direction').teamId;
  if (!ctx.teams.memberIdsByTeam.get(teamId)?.has(memberId)) {
    throw new OpError(`member ${memberId} is not in the row's team ${teamId}`);
  }
}

/** Строка нового назначения — эпик или направление, ровно одно (QG2). */
function resolveAssignRow(ctx: OpContext, plan: QuarterlyPlanContent, op: AssignmentRow): AssignmentRow {
  if ((op.epicId === undefined) === (op.directionId === undefined)) {
    throw new OpError('needs exactly one of epicId and directionId');
  }
  return op.epicId === undefined
    ? { directionId: findOr(plan.directions, resolveId(ctx, op.directionId!), 'direction').id }
    : { epicId: findOr(plan.epics, resolveId(ctx, op.epicId), 'epic').id };
}

/** Фаза в плане: discovery хранится, delivery — отсутствием поля (QG1). */
function phasePatch(value: 'delivery' | 'discovery'): Pick<QuarterlyPlanAssignment, 'phase'> {
  return { phase: value === 'discovery' ? 'discovery' : undefined };
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

/** Куда встаёт новая строка: эпик — в направление, задача — под эпик своего направления (QT1, QT2). */
function resolveEpicParent(
  ctx: OpContext,
  plan: QuarterlyPlanContent,
  op: { directionId?: string; parentEpicId?: string }
): { directionId: string; parentEpicId?: string } {
  if ((op.directionId === undefined) === (op.parentEpicId === undefined)) {
    throw new OpError('needs exactly one of directionId and parentEpicId');
  }
  if (op.parentEpicId === undefined) {
    return { directionId: findOr(plan.directions, resolveId(ctx, op.directionId!), 'direction').id };
  }
  const parent = findOr(plan.epics, resolveId(ctx, op.parentEpicId), 'epic');
  if (parent.parentEpicId !== undefined) throw new OpError(`epic ${parent.id} is a task itself; a task cannot have tasks`);
  return { directionId: parent.directionId, parentEpicId: parent.id };
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
    if (existing) {
      remember(ctx, op.ref, existing.id);
      return plan;
    }
    const afterId =
      op.afterId === undefined ? undefined : findOr(plan.directions, resolveId(ctx, op.afterId), 'direction').id;
    const id = ctx.newId();
    created(ctx, op.ref, id);
    return addDirection(plan, { id, teamId, title: op.title }, afterId);
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
  // Порядок направлений — только внутри команды (QO2).
  moveDirection: (plan, op, ctx) => {
    const direction = findOr(plan.directions, resolveId(ctx, op.directionId), 'direction');
    const anchor = findOr(plan.directions, resolveId(ctx, op.anchorId), 'direction');
    if (direction.id === anchor.id) throw new OpError('a row cannot be placed next to itself');
    if (direction.teamId !== anchor.teamId) throw new OpError('directions of different teams');
    return moveDirection(plan, direction.id, anchor.id, op.place);
  },
  addEpic: (plan, op, ctx) => {
    const parent = resolveEpicParent(ctx, plan, op);
    if (op.issueKey) requireIssueFree(plan, op.issueKey);
    const epicTitle = op.title ?? op.issueKey;
    if (!epicTitle) throw new OpError('epic needs a title or an issueKey');
    const afterId = op.afterId === undefined ? undefined : findOr(plan.epics, resolveId(ctx, op.afterId), 'epic').id;
    const id = ctx.newId();
    created(ctx, op.ref, id);
    return addEpic(
      plan,
      { ...parent, id, ...(op.issueKey ? { issueKey: op.issueKey } : {}), status: op.status ?? 'backlog', title: epicTitle },
      afterId
    );
  },
  // Строка остаётся на своём уровне и в своей команде (QO3).
  moveEpic: (plan, op, ctx) => {
    const epicId = findOr(plan.epics, resolveId(ctx, op.epicId), 'epic').id;
    const anchorId = findOr(plan.epics, resolveId(ctx, op.anchorId), 'epic').id;
    const error = moveEpicError(plan, epicId, anchorId);
    if (error) throw new OpError(error);
    return moveEpic(plan, epicId, anchorId, op.place);
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
    const row = resolveAssignRow(ctx, plan, op);
    requireTeamMember(ctx, plan, row, op.memberId);
    // В строке направления полоса по умолчанию — discovery, в строке эпика — delivery (QG2).
    const isDiscovery = (op.phase ?? (row.directionId ? 'discovery' : 'delivery')) === 'discovery';
    const id = ctx.newId();
    created(ctx, op.ref, id);
    return addAssignment(plan, {
      ...row,
      id,
      memberId: op.memberId,
      ...(isDiscovery ? { phase: 'discovery' as const } : {}),
      ...resolveAssignmentSpan(ctx, op.span),
    });
  },
  updateAssignment: (plan, op, ctx) => {
    const assignment = findOr(plan.assignments, resolveId(ctx, op.assignmentId), 'assignment');
    if (op.memberId) requireTeamMember(ctx, plan, assignment, op.memberId);
    return updateAssignment(plan, assignment.id, {
      ...(op.memberId ? { memberId: op.memberId } : {}),
      ...(op.phase ? phasePatch(op.phase) : {}),
      ...(op.span ? resolveAssignmentSpan(ctx, op.span) : {}),
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
    created(ctx, op.ref, id);
    return addLink(plan, { fromId, id, toId });
  },
  removeLink: (plan, op, ctx) => removeLink(plan, findOr(plan.links, resolveId(ctx, op.linkId), 'link').id),
  addNote: (plan, op, ctx) => {
    const id = ctx.newId();
    const noteSpan = resolveSpan(ctx, op.span);
    const note = {
      color: op.color ?? 'yellow',
      id,
      row: requireRow(ctx, plan, op.row),
      // Высоту агент обычно не задаёт: она подбирается по тексту и ширине (QN2).
      rows: op.rows ?? estimateQuarterNoteRows(op.text, noteSpan.weeks),
      text: op.text,
      ...noteSpan,
    };
    created(ctx, op.ref, id);
    return addNote(plan, note);
  },
  updateNote: (plan, op, ctx) => {
    const note = findOr(plan.notes, resolveId(ctx, op.noteId), 'note');
    const noteSpan = op.span ? resolveSpan(ctx, op.span) : null;
    // Сменился текст или ширина, а высоту не задали — она подбирается заново (QN2).
    const refit = op.rows === undefined && (op.text !== undefined || noteSpan !== null);
    const rows = refit ? estimateQuarterNoteRows(op.text ?? note.text, (noteSpan ?? note).weeks) : op.rows;
    return updateNote(plan, note.id, {
      ...(op.color ? { color: op.color } : {}),
      ...(op.row ? { row: requireRow(ctx, plan, op.row) } : {}),
      ...(rows ? { rows } : {}),
      ...(noteSpan ?? {}),
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

/** Поле операции изменения или удаления, где лежит её сущность. */
const TARGET_FIELD: Partial<Record<QuarterlyPlanOp['op'], string>> = {
  moveDirection: 'directionId',
  moveEpic: 'epicId',
  removeAssignment: 'assignmentId',
  removeDirection: 'directionId',
  removeEpic: 'epicId',
  removeLink: 'linkId',
  removeNote: 'noteId',
  updateAssignment: 'assignmentId',
  updateDirection: 'directionId',
  updateEpic: 'epicId',
  updateNote: 'noteId',
};

/** Сущность плана, которую трогает операция: созданная, изменённая или удалённая; null — ничего (QM5). */
function targetOf(op: QuarterlyPlanOp, ctx: OpContext): string | null {
  const field = TARGET_FIELD[op.op];
  if (!field) return ctx.created;
  const value = (op as Record<string, unknown>)[field];
  return typeof value === 'string' ? resolveId(ctx, value) : null;
}

/**
 * Применяет пакет целиком или не применяет вовсе (QM1): первая ошибка называет номер операции.
 * Люди — в форме клиента (`Developer.id`); план на выходе ещё проверяет сохранение (QS1).
 * `targets` — сущность каждой операции (по ним черновик делится на пункты, QM10); `newId` получает номер операции.
 */
export function applyQuarterlyPlanOps(input: {
  content: QuarterlyPlanContent;
  newId?: (opIndex: number) => string;
  ops: readonly QuarterlyPlanOp[];
  ref: QuarterRef;
  teams: QuarterlyPlanOpsTeams;
}): ApplyQuarterlyPlanOpsResult {
  const weeks = buildQuarterWeeks(input.ref);
  const makeId = input.newId ?? (() => randomUuid());
  let opIndex = 0;
  const ctx: OpContext = {
    created: null,
    newId: () => makeId(opIndex),
    refs: new Map(),
    teams: input.teams,
    weekCount: weeks.length,
    weeks,
  };
  let plan = input.content;
  const targets: (string | null)[] = [];
  for (const [index, op] of input.ops.entries()) {
    opIndex = index;
    ctx.created = null;
    try {
      plan = applyOp(plan, op, ctx);
      targets.push(targetOf(op, ctx));
    } catch (error) {
      if (error instanceof OpError) return { error: `${op.op}: ${error.message}`, ok: false, opIndex: index };
      throw error;
    }
  }
  return { content: plan, ok: true, refs: Object.fromEntries(ctx.refs), targets };
}

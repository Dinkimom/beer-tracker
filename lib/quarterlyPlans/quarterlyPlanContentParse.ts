import type { QuarterlyPlanContent, QuarterRef } from './quarterlyPlanTypes';

import { z } from 'zod';

import { STICKY_NOTE_COLORS } from '@/lib/comments/stickyNoteColor';

import { areLinked, planIssueKeys, QUARTER_NOTE_MAX_ROWS } from './quarterlyPlanLayout';
import { buildQuarterWeeks } from './quarterWeeks';

/** Квартал из запроса (`?year=&quarter=` или тело): числа приводятся, квартал — 1–4. */
export const QuarterRefSchema = z.object({
  quarter: z.coerce.number().pipe(z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])),
  year: z.coerce.number().int().min(2000).max(2100),
});

const MAX_ITEMS = 2000;
const MAX_TITLE_LENGTH = 300;
const MAX_NOTE_LENGTH = 5000;

const id = z.string().trim().min(1).max(80);
const title = z.string().trim().min(1).max(MAX_TITLE_LENGTH);
const span = { startWeek: z.number().int().min(0), weeks: z.number().int().min(1) };

const contentSchema = z.object({
  assignments: z
    .array(z.object({ epicId: id, id, memberId: id, ...span }))
    .max(MAX_ITEMS),
  directions: z
    .array(z.object({ id, issueKey: z.string().trim().min(1).max(64).optional(), teamId: id, title }))
    .max(MAX_ITEMS),
  epics: z
    .array(
      z.object({
        directionId: id,
        id,
        issueKey: z.string().trim().min(1).max(64).optional(),
        status: z.enum(['backlog', 'blocked', 'done', 'in_progress', 'test']),
        title,
      })
    )
    .max(MAX_ITEMS),
  links: z.array(z.object({ fromId: id, id, toId: id })).max(MAX_ITEMS),
  notes: z
    .array(
      z.object({
        color: z.enum(STICKY_NOTE_COLORS),
        id,
        row: z.object({ id, kind: z.enum(['absence', 'direction', 'epic', 'team']) }),
        rows: z.number().int().min(1).max(QUARTER_NOTE_MAX_ROWS),
        text: z.string().max(MAX_NOTE_LENGTH),
        ...span,
      })
    )
    .max(MAX_ITEMS),
});

type ParseResult = { content: QuarterlyPlanContent; ok: true } | { error: string; ok: false };

function firstDuplicate(values: readonly string[]): string | undefined {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
}

/** Сущности одного вида не делят id; эпик трекера стоит в плане один раз (QE4). */
function duplicateError(content: QuarterlyPlanContent): string | null {
  const collections = {
    assignments: content.assignments,
    directions: content.directions,
    epics: content.epics,
    links: content.links,
    notes: content.notes,
  };
  for (const [name, items] of Object.entries(collections)) {
    const duplicate = firstDuplicate(items.map((item) => item.id));
    if (duplicate) return `${name}: duplicate id ${duplicate}`;
  }
  const issueKey = firstDuplicate(planIssueKeys(content));
  return issueKey ? `issue ${issueKey} is in the plan twice` : null;
}

/** Каждая ссылка ведёт на существующую сущность: эпик — на направление, назначение — на эпик и т.д. */
function referenceError(content: QuarterlyPlanContent, teamIds: ReadonlySet<string> | null): string | null {
  const directionIds = new Set(content.directions.map((direction) => direction.id));
  const epicIds = new Set(content.epics.map((epic) => epic.id));
  const assignmentIds = new Set(content.assignments.map((assignment) => assignment.id));
  const rowExists = {
    absence: (rowId: string) => !teamIds || teamIds.has(rowId),
    direction: (rowId: string) => directionIds.has(rowId),
    epic: (rowId: string) => epicIds.has(rowId),
    team: (rowId: string) => !teamIds || teamIds.has(rowId),
  };
  const problems = [
    ...content.directions
      .filter((direction) => teamIds && !teamIds.has(direction.teamId))
      .map((direction) => `direction ${direction.id}: unknown team ${direction.teamId}`),
    ...content.epics
      .filter((epic) => !directionIds.has(epic.directionId))
      .map((epic) => `epic ${epic.id}: unknown direction ${epic.directionId}`),
    ...content.assignments
      .filter((assignment) => !epicIds.has(assignment.epicId))
      .map((assignment) => `assignment ${assignment.id}: unknown epic ${assignment.epicId}`),
    ...content.links
      .filter((link) => !assignmentIds.has(link.fromId) || !assignmentIds.has(link.toId))
      .map((link) => `link ${link.id}: unknown assignment`),
    ...content.notes
      .filter((note) => !rowExists[note.row.kind](note.row.id))
      .map((note) => `note ${note.id}: unknown ${note.row.kind} ${note.row.id}`),
  ];
  return problems[0] ?? null;
}

/** Связь — между двумя разными назначениями и одна на пару в любую сторону (QL4). */
function linkError(content: QuarterlyPlanContent): string | null {
  for (const [index, link] of content.links.entries()) {
    if (link.fromId === link.toId) return `link ${link.id}: links an assignment to itself`;
    if (areLinked(content.links.slice(0, index), link.fromId, link.toId)) {
      return `link ${link.id}: assignments are already linked`;
    }
  }
  return null;
}

/** Назначения и заметки — целые недели в пределах квартала (QA1, QN2). */
function spanError(content: QuarterlyPlanContent, weekCount: number): string | null {
  const outside = [...content.assignments, ...content.notes].find(
    (item) => item.startWeek + item.weeks > weekCount
  );
  return outside ? `${outside.id}: weeks ${outside.startWeek}+${outside.weeks} outside the quarter (${weekCount})` : null;
}

/**
 * Содержимое квартального плана из запроса: форма, ссылки между сущностями, сроки в пределах квартала.
 * `teamIds` — команды плана; без них ссылки на команды не проверяются.
 * Членство исполнителя в команде не проверяется: назначения ушедших остаются в плане (QI6).
 */
export function parseQuarterlyPlanContent(
  raw: unknown,
  ref: QuarterRef,
  teamIds: ReadonlySet<string> | null = null
): ParseResult {
  const parsed = contentSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `${issue?.path.join('.') ?? ''}: ${issue?.message ?? 'invalid'}`, ok: false };
  }
  const content: QuarterlyPlanContent = parsed.data;
  const error =
    duplicateError(content) ??
    referenceError(content, teamIds) ??
    linkError(content) ??
    spanError(content, buildQuarterWeeks(ref).length);
  return error ? { error, ok: false } : { content, ok: true };
}

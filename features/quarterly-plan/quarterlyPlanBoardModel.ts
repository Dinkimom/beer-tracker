import type { AvailabilityCardKind } from '@/lib/boardAvailability/availabilityCardKind';
import type { QuarterlyPlanDraftDiff } from '@/lib/quarterlyPlans/quarterlyPlanDraftDiff';
import type { MemberAbsenceDays } from '@/lib/quarterlyPlans/quarterlyPlanIssues';
import type {
  QuarterlyPlanAssignment,
  QuarterlyPlanEpicStatus,
  QuarterlyPlanTeam,
} from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { QuarterWeek } from '@/lib/quarterlyPlans/quarterWeeks';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { buildUnavailableDayHatchKinds } from '@/features/swimlane/utils/availabilityTimelineMarks';
import { buildMemberAbsenceDays } from '@/lib/quarterlyPlans/quarterlyPlanIssues';
import {
  absentDaysWithinSpan,
  assignBarLanes,
  groupConsecutiveDays,
  overlapWeeks,
} from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { quarterDayIsoDate, QUARTER_WORKING_DAYS_PER_WEEK, resolveWeekSpan } from '@/lib/quarterlyPlans/quarterWeeks';
import { getStatusColors } from '@/utils/statusColors';

/** Ширина колонки эпиков по умолчанию; пользователь меняет её ручкой на правой границе. */
export const QUARTER_LEFT_COLUMN_PX = 380;
const QUARTER_LEFT_COLUMN_MIN_PX = 240;
const QUARTER_LEFT_COLUMN_MAX_PX = 720;
/** Текущая ширина колонки: доска кладёт её в CSS-переменную, строки и подписи читают оттуда. */
export const QUARTER_LEFT_COLUMN_WIDTH = 'var(--quarter-left-col)';

export function clampQuarterLeftColumnWidth(width: number): number {
  return Math.min(QUARTER_LEFT_COLUMN_MAX_PX, Math.max(QUARTER_LEFT_COLUMN_MIN_PX, width));
}
/** Неделя в полтора раза шире, чем при вписывании квартала в экран: таймлайн листается вбок. */
export const QUARTER_WEEK_MIN_WIDTH_PX = 128;
export const QUARTER_LANE_HEIGHT_PX = 28;
export const QUARTER_ROW_PADDING_PX = 4;
/** Строки команды и направления — той же высоты, что эпик в одну дорожку. */
export const QUARTER_ROW_HEIGHT_PX = QUARTER_LANE_HEIGHT_PX + QUARTER_ROW_PADDING_PX * 2;
/** Высота одной из двух строк шапки (месяцы, недели); строка команды липнет сразу под шапкой. */
export const QUARTER_HEADER_ROW_PX = 28;

/** Приглушённая линия между неделями — одна и та же в шапке и в строках. */
export const QUARTER_WEEK_LINE = 'color-mix(in srgb, var(--ds-border-subtle) 55%, transparent)';

/**
 * Штриховка отмеченного участка полосы: человек отсутствует, в те же недели у него больше двух эпиков (QI2)
 * или он дежурит (QV3). Бледная и редкая: отметок на большом плане много, штриховка не должна забивать полосы.
 * Вид один — причину называет подсказка у значка, проблему от риска отличает сам значок. Рисуется цветом текста полосы (`currentColor`),
 * поэтому остаётся в её тоне и не даёт грязных смесей.
 */
export const QUARTER_ISSUE_HATCH =
  'repeating-linear-gradient(-45deg, color-mix(in srgb, currentColor 14%, transparent) 0 1.5px, transparent 1.5px 7px)';

/** Новая заметка занимает две недели — в одну короткий текст не помещается. */
export const QUARTER_NEW_NOTE_WEEKS = 2;
/** И две дорожки по высоте: помещаются три строки текста. */
export const QUARTER_NEW_NOTE_ROWS = 2;

/** Высота стикера в `rows` дорожек: между соседними остаётся зазор, как у полос. */
export function quarterNoteHeightPx(rows: number): number {
  return rows * QUARTER_LANE_HEIGHT_PX - 4;
}

/** Место листа заметки в строке: недели — по горизонтали, дорожка и высота — по вертикали. */
export function quarterNoteBoxStyle(
  box: { rows: number; startWeek: number; weeks: number },
  lane: number,
  topPx: number,
  weekCount: number
): { height: number; left: string; top: number; width: string } {
  return {
    height: quarterNoteHeightPx(box.rows),
    left: `calc(${(box.startWeek / weekCount) * 100}% + 2px)`,
    top: topPx + lane * QUARTER_LANE_HEIGHT_PX + 2,
    width: `calc(${(box.weeks / weekCount) * 100}% - 4px)`,
  };
}

/** Отступ липкой подписи от левой колонки: подпись полосы остаётся на экране при прокрутке вбок. */
export const QUARTER_STICKY_LABEL_LEFT = `calc(${QUARTER_LEFT_COLUMN_WIDTH} + 6px)`;

/** Высота строки под `laneCount` дорожек полос. */
export function quarterRowHeightPx(laneCount: number): number {
  return laneCount * QUARTER_LANE_HEIGHT_PX + QUARTER_ROW_PADDING_PX * 2;
}

/** Раскладка полос строки: дорожки, недели под полосами и место полос в дорожках заметок. */
export function layoutRowBars(assignments: readonly QuarterlyPlanAssignment[]) {
  const { laneById, laneCount } = assignBarLanes(assignments);
  return {
    laneById,
    laneCount,
    noteBlockers: assignments.map((assignment) => ({
      lane: laneById.get(assignment.id) ?? 0,
      rows: 1,
      startWeek: assignment.startWeek,
      weeks: assignment.weeks,
    })),
    occupiedWeeks: new Set(
      assignments.flatMap((assignment) =>
        Array.from({ length: assignment.weeks }, (_, offset) => assignment.startWeek + offset)
      )
    ),
  };
}

/** Статус строки плана → ключ палитры карточек планера. */
export const QUARTER_STATUS_PALETTE_KEY: Record<QuarterlyPlanEpicStatus, string> = {
  backlog: 'backlog',
  blocked: 'blocked',
  done: 'closed',
  in_progress: 'inprogress',
  test: 'intesting',
};

/**
 * Заливка, кромка и текст полосы — по статусу строки (QA9), той же палитрой, что тег статуса и карточки
 * планера. Строка без статуса (направление без эпика трекера) — как бэклог.
 */
export function quarterBarToneClass(statusKey: string | undefined): string {
  const colors = getStatusColors(statusKey ?? QUARTER_STATUS_PALETTE_KEY.backlog);
  return [colors.bg, colors.bgDark, colors.text, colors.textDark, colors.border, colors.borderDark].filter(Boolean).join(' ');
}

export const QUARTER_STATUS_ORDER: QuarterlyPlanEpicStatus[] = [
  'backlog',
  'in_progress',
  'test',
  'done',
  'blocked',
];

/** Отсутствия человека для доски: дни из `lib` и штриховка дней для таймлайна. */
export interface MemberAbsence extends MemberAbsenceDays {
  hatchKinds: Map<number, AvailabilityCardKind>;
}

/** Отсутствия людей на таймлайне квартала (`buildMemberAbsenceDays`) со штриховкой для доски. */
export function buildAbsenceByMember(
  teams: readonly QuarterlyPlanTeam[],
  eventsByBoard: ReadonlyMap<number, BoardAvailabilityEvent[]>,
  weeks: readonly QuarterWeek[]
): Map<string, MemberAbsence> {
  return new Map(
    [...buildMemberAbsenceDays(teams, eventsByBoard, weeks)].map(([memberId, days]) => [
      memberId,
      { ...days, hatchKinds: buildUnavailableDayHatchKinds(days.segments) },
    ])
  );
}

/**
 * Отмеченные участки полосы в днях квартала. `issues` — штриховка проблем: человек отсутствует или в те же
 * недели занят другим эпиком (участки двух причин не накладываются). `risks` — точки дежурства (QV3)
 * там, где нет штриховки.
 */
export function barDayMarks(
  assignment: QuarterlyPlanAssignment,
  absence: MemberAbsence | undefined,
  memberAssignments: readonly QuarterlyPlanAssignment[]
): { issues: Array<{ dayCount: number; startDay: number }>; risks: Array<{ dayCount: number; startDay: number }> } {
  const parallelDays = overlapWeeks(assignment, memberAssignments).flatMap((week) =>
    Array.from({ length: QUARTER_WORKING_DAYS_PER_WEEK }, (_, offset) => week * QUARTER_WORKING_DAYS_PER_WEEK + offset)
  );
  const issueDays = new Set([...absentDaysWithinSpan(assignment, absence?.blockedDays ?? new Set()), ...parallelDays]);
  const riskDays = absentDaysWithinSpan(assignment, absence?.dutyDays ?? new Set()).filter((day) => !issueDays.has(day));
  return {
    issues: groupConsecutiveDays([...issueDays].sort((a, b) => a - b)),
    risks: groupConsecutiveDays(riskDays),
  };
}

/** Срок полосы: первый день первой недели — последний день последней. */
export function formatSpanRange(
  weeks: readonly QuarterWeek[],
  span: { startWeek: number; weeks: number }
): string {
  const first = weeks[span.startWeek];
  const last = weeks[span.startWeek + span.weeks - 1];
  if (!first || !last) return '';
  const [, startMonth, startDay] = first.startDate.split('-');
  const [, endMonth, endDay] = last.endDate.split('-');
  return `${startDay}.${startMonth}–${endDay}.${endMonth}`;
}

export function formatWeekRange(week: QuarterWeek): string {
  const [, startMonth, startDay] = week.startDate.split('-');
  const [, endMonth, endDay] = week.endDate.split('-');
  return startMonth === endMonth
    ? `${startDay}–${endDay}.${endMonth}`
    : `${startDay}.${startMonth}–${endDay}.${endMonth}`;
}

/** Кнопка-иконка в строке: появляется при наведении на строку и при фокусе. */
export const QUARTER_ROW_ACTION_CLASS =
  '!h-6 !w-6 opacity-0 focus-visible:opacity-100 group-hover/row:opacity-100';

/** Что показанный черновик агента сделал со строкой, полосой или заметкой (QM9); null — не трогал или черновика нет. */
export function draftMarkOf(
  draftMarks: QuarterlyPlanDraftDiff | null,
  id: string
): 'added' | 'changed' | 'linked' | 'removed' | null {
  if (!draftMarks) return null;
  if (draftMarks.added.has(id)) return 'added';
  if (draftMarks.removed.has(id)) return 'removed';
  // Привязка к задаче трекера — не правка самой строки: «изменено» остаётся за названием и остальным.
  if (draftMarks.linked.has(id)) return 'linked';
  return draftMarks.changed.has(id) ? 'changed' : null;
}

/** Обводка того, что тронул показанный черновик агента: синий пунктир, убранное — красный и бледнее; иначе пусто. */
export function draftOutlineClass(draftMarks: QuarterlyPlanDraftDiff | null, id: string): string {
  const mark = draftMarkOf(draftMarks, id);
  if (mark === 'removed') return 'opacity-60 outline-dashed outline-2 outline-offset-1 outline-red-500';
  return mark ? 'outline-dashed outline-2 outline-offset-1 outline-blue-500' : '';
}

/**
 * Строки отсутствий команды (QV2): дежурства — график, человек работает (риск, QV3); отпуска и больничные —
 * человека нет. Первый вид строки — тот, которым встаёт новая плашка; остальные выбирают в её меню.
 */
export const QUARTER_ABSENCE_ROW_KINDS = {
  away: ['vacation', 'sick_leave'],
  duty: ['duty'],
} as const satisfies Record<string, readonly AvailabilityCardKind[]>;

export type QuarterAbsenceRowGroup = keyof typeof QUARTER_ABSENCE_ROW_KINDS;

/**
 * Даты отсутствия после переноса или растягивания плашки (QV4). Сдвинутый край встаёт на свой рабочий день
 * квартала; край, который не трогали, остаётся как был — так событие, начатое до квартала или
 * кончающееся в выходной, не обрезается от растягивания другого края.
 */
export function absenceDatesAfterDrag(input: {
  event: Pick<BoardAvailabilityEvent, 'endDate' | 'startDate'>;
  /** Плашка до жеста и после него, в рабочих днях квартала. */
  from: { days: number; startDay: number };
  to: { days: number; startDay: number };
  weeks: readonly QuarterWeek[];
}): Pick<BoardAvailabilityEvent, 'endDate' | 'startDate'> {
  const { event, from, to, weeks } = input;
  const startMoved = to.startDay !== from.startDay;
  const endMoved = to.startDay + to.days !== from.startDay + from.days;
  return {
    endDate: (endMoved ? quarterDayIsoDate(weeks, to.startDay + to.days - 1) : null) ?? event.endDate,
    startDate: (startMoved ? quarterDayIsoDate(weeks, to.startDay) : null) ?? event.startDate,
  };
}

/**
 * Недели квартала, с которых начинаются спринты команды, кроме первой недели: по ним строки команды
 * проводят границы спринтов. Спринт вне квартала границы не даёт.
 */
export function sprintStartWeeks(
  sprints: ReadonlyArray<{ endDate: string; startDate: string }>,
  weeks: readonly QuarterWeek[]
): number[] {
  const starts = sprints.flatMap((sprint) => {
    const span = resolveWeekSpan(weeks, sprint.startDate, sprint.endDate);
    return span && span.startWeek > 0 ? [span.startWeek] : [];
  });
  return [...new Set(starts)].sort((a, b) => a - b);
}

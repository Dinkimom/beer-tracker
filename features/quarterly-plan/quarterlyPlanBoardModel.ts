import type { AvailabilityCardKind } from '@/lib/boardAvailability/availabilityCardKind';
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
  groupConsecutiveDays,
  overlapWeeks,
} from '@/lib/quarterlyPlans/quarterlyPlanLayout';
import { QUARTER_WORKING_DAYS_PER_WEEK } from '@/lib/quarterlyPlans/quarterWeeks';

export const QUARTER_LEFT_COLUMN_PX = 380;
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
 * Штриховка проблемного участка полосы: человек отсутствует или в те же недели занят другим эпиком.
 * Вид один — причину называет подсказка у значка. Рисуется цветом текста полосы (`currentColor`),
 * поэтому остаётся в её тоне и не даёт грязных смесей.
 */
export const QUARTER_ISSUE_HATCH =
  'repeating-linear-gradient(-45deg, color-mix(in srgb, currentColor 30%, transparent) 0 2px, transparent 2px 6px)';

/**
 * Дни дежурства на полосе — риск, а не проблема (QV3): точки вместо штриховки, тем же цветом текста полосы.
 */
export const QUARTER_RISK_DOTS = 'radial-gradient(color-mix(in srgb, currentColor 45%, transparent) 1px, transparent 1.5px)';

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
export const QUARTER_STICKY_LABEL_LEFT_PX = QUARTER_LEFT_COLUMN_PX + 6;

/** Высота строки под `laneCount` дорожек полос. */
export function quarterRowHeightPx(laneCount: number): number {
  return laneCount * QUARTER_LANE_HEIGHT_PX + QUARTER_ROW_PADDING_PX * 2;
}

/** Заливка и кромка полосы — по человеку; тень и подъём полосе даёт «картон» карточек планера. */
const BAR_TONES = [
  'border-sky-200 bg-sky-100 text-sky-950 dark:border-sky-400/30 dark:bg-sky-500/25 dark:text-sky-100',
  'border-emerald-200 bg-emerald-100 text-emerald-950 dark:border-emerald-400/30 dark:bg-emerald-500/25 dark:text-emerald-100',
  'border-amber-200 bg-amber-100 text-amber-950 dark:border-amber-400/30 dark:bg-amber-500/25 dark:text-amber-100',
  'border-violet-200 bg-violet-100 text-violet-950 dark:border-violet-400/30 dark:bg-violet-500/25 dark:text-violet-100',
  'border-rose-200 bg-rose-100 text-rose-950 dark:border-rose-400/30 dark:bg-rose-500/25 dark:text-rose-100',
  'border-teal-200 bg-teal-100 text-teal-950 dark:border-teal-400/30 dark:bg-teal-500/25 dark:text-teal-100',
  'border-orange-200 bg-orange-100 text-orange-950 dark:border-orange-400/30 dark:bg-orange-500/25 dark:text-orange-100',
  'border-indigo-200 bg-indigo-100 text-indigo-950 dark:border-indigo-400/30 dark:bg-indigo-500/25 dark:text-indigo-100',
  'border-lime-200 bg-lime-100 text-lime-950 dark:border-lime-400/30 dark:bg-lime-500/25 dark:text-lime-100',
] as const;

export function buildToneByKey(keys: readonly string[]): Map<string, string> {
  return new Map(keys.map((key, index) => [key, BAR_TONES[index % BAR_TONES.length]!]));
}

/** Статус строки плана → ключ палитры карточек планера. */
export const QUARTER_STATUS_PALETTE_KEY: Record<QuarterlyPlanEpicStatus, string> = {
  backlog: 'backlog',
  blocked: 'blocked',
  done: 'closed',
  in_progress: 'inprogress',
  test: 'intesting',
};

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

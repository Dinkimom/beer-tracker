import type { AvailabilityCardKind } from '@/lib/boardAvailability/availabilityCardKind';
import type { QuarterlyPlanDraftDiff } from '@/lib/quarterlyPlans/quarterlyPlanDraftDiff';
import type { MemberAbsenceDays } from '@/lib/quarterlyPlans/quarterlyPlanIssues';
import type {
  QuarterlyPlanAssignment,
  QuarterlyPlanEpicStatus,
  QuarterlyPlanSprint,
  QuarterlyPlanTeam,
  QuarterRef,
} from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { QuarterWeek } from '@/lib/quarterlyPlans/quarterWeeks';
import type { SprintGoalPlanRow } from '@/lib/sprintGoals/sprintGoalPlanRow';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { buildUnavailableDayHatchKinds } from '@/features/swimlane/utils/availabilityTimelineMarks';
import { buildMemberAbsenceDays } from '@/lib/quarterlyPlans/quarterlyPlanIssues';
import {
  absentDaysWithinSpan,
  assignBarLanes,
  assignNoteLanes,
  daySpanOf,
  type DaySpan,
  type NoteLaneBlocker,
  groupConsecutiveDays,
  overloadedDays,
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
/** Линия между днями недели на уровне «По дням» (QZ2): слабее недельной, чтобы недели читались. */
export const QUARTER_DAY_LINE = 'color-mix(in srgb, var(--ds-border-subtle) 28%, transparent)';

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
export function quarterNoteHeightPx(rows: number, laneHeightPx: number = QUARTER_LANE_HEIGHT_PX): number {
  return rows * laneHeightPx - 4;
}

/** Место листа заметки в строке: недели — по горизонтали, дорожка и высота — по вертикали. */
export function quarterNoteBoxStyle(
  box: { rows: number; startWeek: number; weeks: number },
  lane: number,
  topPx: number,
  weekCount: number,
  laneHeightPx: number = QUARTER_LANE_HEIGHT_PX
): { height: number; left: string; top: number; width: string } {
  return {
    height: quarterNoteHeightPx(box.rows, laneHeightPx),
    left: `calc(${(box.startWeek / weekCount) * 100}% + 2px)`,
    top: topPx + lane * laneHeightPx + 2,
    width: `calc(${(box.weeks / weekCount) * 100}% - 4px)`,
  };
}

/** Отступ липкой подписи от левой колонки: подпись полосы остаётся на экране при прокрутке вбок. */
export const QUARTER_STICKY_LABEL_LEFT = `calc(${QUARTER_LEFT_COLUMN_WIDTH} + 6px)`;

/**
 * Свободное место недели для новой полосы: самый длинный отрезок подряд идущих свободных рабочих дней
 * (при равных — первый); null — неделя занята целиком. Без занятых дней — вся неделя.
 */
export function freeDaysOfWeek(week: number, occupiedDays: ReadonlySet<number> | undefined): DaySpan | null {
  let best: DaySpan | null = null;
  let run: DaySpan | null = null;
  for (let offset = 0; offset < QUARTER_WORKING_DAYS_PER_WEEK; offset += 1) {
    const day = week * QUARTER_WORKING_DAYS_PER_WEEK + offset;
    if (occupiedDays?.has(day)) {
      run = null;
      continue;
    }
    run = run ? { days: run.days + 1, startDay: run.startDay } : { days: 1, startDay: day };
    if (!best || run.days > best.days) best = run;
  }
  return best;
}

/** Высота строки под `laneCount` дорожек полос. */
export function quarterRowHeightPx(laneCount: number, laneHeightPx: number = QUARTER_LANE_HEIGHT_PX): number {
  return laneCount * laneHeightPx + QUARTER_ROW_PADDING_PX * 2;
}

/** Раскладка полос строки: дорожки, недели под полосами и место полос в дорожках заметок. */
export function layoutRowBars(assignments: readonly QuarterlyPlanAssignment[]) {
  // Дорожки — по настоящему сроку: задачи на пару дней в одной неделе встают в одну дорожку (QT5).
  const spans = assignments.map((assignment) => {
    const { days, startDay } = daySpanOf(assignment);
    return {
      id: assignment.id,
      startWeek: startDay / QUARTER_WORKING_DAYS_PER_WEEK,
      weeks: days / QUARTER_WORKING_DAYS_PER_WEEK,
    };
  });
  const { laneById, laneCount } = assignBarLanes(spans);
  return {
    laneById,
    laneCount,
    noteBlockers: spans.map(({ id, startWeek, weeks }) => ({ lane: laneById.get(id) ?? 0, rows: 1, startWeek, weeks })),
    /** Рабочие дни, занятые полосами строки: клетка добавления встаёт на свободные дни недели (QT5). */
    occupiedDays: new Set(
      assignments.flatMap((assignment) => {
        const { days, startDay } = daySpanOf(assignment);
        return Array.from({ length: days }, (_, offset) => startDay + offset);
      })
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
 * дни занят другими эпиками сверх нормы (участки двух причин не накладываются). `risks` — точки дежурства (QV3)
 * там, где нет штриховки.
 */
export function barDayMarks(
  assignment: QuarterlyPlanAssignment,
  absence: MemberAbsence | undefined,
  memberAssignments: readonly QuarterlyPlanAssignment[]
): { issues: Array<{ dayCount: number; startDay: number }>; risks: Array<{ dayCount: number; startDay: number }> } {
  const parallelDays = overloadedDays(assignment, memberAssignments);
  const issueDays = new Set([...absentDaysWithinSpan(assignment, absence?.blockedDays ?? new Set()), ...parallelDays]);
  const riskDays = absentDaysWithinSpan(assignment, absence?.dutyDays ?? new Set()).filter((day) => !issueDays.has(day));
  return {
    issues: groupConsecutiveDays([...issueDays].sort((a, b) => a - b)),
    risks: groupConsecutiveDays(riskDays),
  };
}

/** Срок полосы: первый рабочий день — последний; у полосы на один день — одна дата. */
export function formatSpanRange(
  weeks: readonly QuarterWeek[],
  span: { days?: number; startDay?: number; startWeek: number; weeks: number }
): string {
  const { days, startDay } = daySpanOf(span);
  const first = quarterDayIsoDate(weeks, startDay);
  const last = quarterDayIsoDate(weeks, startDay + days - 1);
  if (!first || !last) return '';
  const short = (iso: string) => `${iso.slice(8, 10)  }.${  iso.slice(5, 7)}`;
  return first === last ? short(first) : `${short(first)}–${short(last)}`;
}

/** Период датами: «16.10» или «16.10–21.10». */
export function formatDateRange(startDate: string, endDate: string): string {
  const short = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
  return startDate === endDate ? short(startDate) : `${short(startDate)}–${short(endDate)}`;
}

export function formatWeekRange(week: QuarterWeek): string {
  const [, startMonth, startDay] = week.startDate.split('-');
  const [, endMonth, endDay] = week.endDate.split('-');
  return startMonth === endMonth
    ? `${startDay}–${endDay}.${endMonth}`
    : `${startDay}.${startMonth}–${endDay}.${endMonth}`;
}

/** Кнопка-иконка в строке: появляется при наведении на строку и при фокусе. */
/** Уровни строк плана сверху вниз: направление, эпик, задача эпика (QT1). */
export const QUARTER_ROW_LEVELS = ['direction', 'epic', 'task'] as const;
export type QuarterRowLevel = (typeof QUARTER_ROW_LEVELS)[number];

/**
 * Высота дорожки по уровню строки: чем выше уровень, тем крупнее его полосы — направление, эпик и задача
 * различаются и на таймлайне, не только в колонке. Задача — базовая дорожка, эпик заметно выше.
 */
export const QUARTER_LANE_HEIGHT_BY_LEVEL: Record<QuarterRowLevel, number> = {
  // Полосы: задача 24 px, эпик 30, направление 36 (дорожка на 4 px выше полосы).
  direction: QUARTER_LANE_HEIGHT_PX + 12,
  epic: QUARTER_LANE_HEIGHT_PX + 6,
  task: QUARTER_LANE_HEIGHT_PX,
};

/** Подпись и аватар полосы по уровню строки: у крупной полосы они крупнее, у задачи — как раньше. */
export const QUARTER_BAR_LOOK_BY_LEVEL: Record<QuarterRowLevel, { avatar: '2xs' | 'sm' | 'xs'; text: string }> = {
  direction: { avatar: 'sm', text: 'text-sm font-semibold' },
  epic: { avatar: 'xs', text: 'text-[13px] font-semibold' },
  task: { avatar: '2xs', text: 'text-xs font-medium' },
};

/** Отступ названия строки по уровню; место слева — под стрелку раскрытия и ручку порядка. */
export const QUARTER_ROW_INDENT_CLASS: Record<QuarterRowLevel, string> = {
  direction: 'pl-6',
  epic: 'pl-10',
  task: 'pl-[60px]',
};

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

export type QuarterGoalType = 'delivery' | 'discovery';

/** Цель спринта, как её отдаёт `/sprint-goals`: текст, отметка и строка плана (QG5). */
interface SprintGoalForRow {
  checked: boolean;
  id: string;
  planRow?: SprintGoalPlanRow | null;
  text: string;
}

/**
 * Флажок целей в строке плана (QG8): цели одного типа одного спринта, привязанные к этой строке.
 * Стоит на неделях спринта; несколько целей — один флажок со счётчиком.
 */
export interface QuarterRowGoalFlag {
  /** Доска команды спринта — по ней флажок открывает сайдбар целей. */
  boardId: number;
  goals: Array<{ done: boolean; id: string; text: string }>;
  goalType: QuarterGoalType;
  id: string;
  sprint: QuarterlyPlanSprint;
  startWeek: number;
  weeks: number;
}

/** Цели одного спринта и типа, привязанные к строкам этого плана, — по id строки. */
function linkedGoalsByRow(
  goals: readonly SprintGoalForRow[],
  ref: QuarterRef,
  rowIds: ReadonlySet<string>
): Map<string, QuarterRowGoalFlag['goals']> {
  const byRow = new Map<string, QuarterRowGoalFlag['goals']>();
  for (const goal of goals) {
    const row = goal.planRow;
    if (!row || row.year !== ref.year || row.quarter !== ref.quarter || !rowIds.has(row.rowId)) continue;
    byRow.set(row.rowId, [...(byRow.get(row.rowId) ?? []), { done: goal.checked, id: goal.id, text: goal.text }]);
  }
  return byRow;
}

/**
 * Флажки целей по id строки плана (QG8). Цель попадает в строку, если привязана к этому кварталу и строка
 * есть в плане (`rowIds`); висячая привязка (строку удалили) флажка не даёт. Флажок стоит на неделях спринта
 * цели (QW5), спринт вне квартала — без флажка. Порядок в строке — по неделям, затем delivery, discovery.
 */
export function buildRowGoalFlags(input: {
  goalsOf: (sprintId: number, goalType: QuarterGoalType) => readonly SprintGoalForRow[] | undefined;
  ref: QuarterRef;
  rowIds: ReadonlySet<string>;
  teams: ReadonlyArray<Pick<QuarterlyPlanTeam, 'boardId' | 'sprints'>>;
  weeks: readonly QuarterWeek[];
}): Map<string, QuarterRowGoalFlag[]> {
  const byRow = new Map<string, QuarterRowGoalFlag[]>();
  const sprints = input.teams.flatMap((team) => team.sprints.map((sprint) => ({ boardId: team.boardId, sprint })));
  for (const { boardId, sprint } of sprints) {
    const span = resolveWeekSpan(input.weeks, sprint.startDate, sprint.endDate);
    if (!span) continue;
    for (const goalType of ['delivery', 'discovery'] as const) {
      const rows = linkedGoalsByRow(input.goalsOf(sprint.id, goalType) ?? [], input.ref, input.rowIds);
      for (const [rowId, goals] of rows) {
        const flag = { boardId, goals, goalType, id: `${sprint.id}:${goalType}:${rowId}`, sprint, ...span };
        byRow.set(rowId, [...(byRow.get(rowId) ?? []), flag]);
      }
    }
  }
  for (const flags of byRow.values()) flags.sort((a, b) => a.startWeek - b.startWeek);
  return byRow;
}

/**
 * Дорожки целей в строке (QG8): цели всегда сверху. Полосы строки (`barBlockers`) сдвигаются под цели на
 * `barsTopLanes` дорожек — но только если полосы есть: в строке с одними целями цель стоит в первой дорожке,
 * и строка не растёт на пустую дорожку под полосы. `blockers` — цели и сдвинутые полосы: их обходят заметки.
 * Подпись строки (`labelHeightPx`) с целями — на верхней линии, напротив первой цели; без целей — посередине
 * содержимого строки (`contentHeightPx`).
 */
export function layoutRowGoals(
  flags: ReadonlyArray<Pick<QuarterRowGoalFlag, 'id' | 'startWeek' | 'weeks'>>,
  barBlockers: readonly NoteLaneBlocker[] = [],
  size: { contentHeightPx: number; laneHeightPx: number } = { contentHeightPx: QUARTER_ROW_HEIGHT_PX, laneHeightPx: QUARTER_LANE_HEIGHT_PX }
): {
  barsTopLanes: number;
  barsTopPx: number;
  blockers: NoteLaneBlocker[];
  goalLaneCount: number;
  goalLanes: Map<string, number>;
  labelHeightPx: number;
} {
  const goalLanes = assignNoteLanes(flags.map((flag) => ({ id: flag.id, rows: 1, startWeek: flag.startWeek, weeks: flag.weeks }))).laneById;
  const goalLaneCount = Math.max(0, ...flags.map((flag) => (goalLanes.get(flag.id) ?? 0) + 1));
  const barsTopLanes = barBlockers.length > 0 ? goalLaneCount : 0;
  return {
    barsTopLanes,
    barsTopPx: barsTopLanes * size.laneHeightPx,
    blockers: [
      ...flags.map((flag) => ({ lane: goalLanes.get(flag.id) ?? 0, rows: 1, startWeek: flag.startWeek, weeks: flag.weeks })),
      ...barBlockers.map((blocker) => ({ ...blocker, lane: blocker.lane + barsTopLanes })),
    ],
    goalLaneCount,
    goalLanes,
    labelHeightPx: goalLaneCount > 0 ? size.laneHeightPx + QUARTER_ROW_PADDING_PX * 2 : size.contentHeightPx,
  };
}

import type { DemoFixtureState } from './demoFixtureSeed';

import { computeSprintCompletionScope } from '@/lib/sprints/sprintScoreHelpers';

import { DEMO_PLANNER_NOW, DEMO_SPRINT_ID } from './demoIds';

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** `2026-10-13` или `20261013` (так шлёт календарь праздников) → ISO date-only. */
function toIsoDate(value: string): string {
  return /^\d{8}$/.test(value) ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` : value;
}

function eachDayInclusive(startIso: string, endIso: string): Date[] {
  const start = new Date(`${toIsoDate(startIso)}T12:00:00`);
  const end = new Date(`${toIsoDate(endIso)}T12:00:00`);
  const days: Date[] = [];
  for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    days.push(new Date(cur));
  }
  return days;
}

/**
 * Synthetic burndown curve for the fixture sprint (no tracker changelog).
 * Объём и «сделано» — тем же `computeSprintCompletionScope`, что плитки и скор ретро (без QA-задач и целей,
 * как боевой бёрндаун): иначе цифры одного спринта на ретро и бёрндауне расходились (TP 16 против 21).
 * Сделанное копится до «сегодня» демо (`DEMO_PLANNER_NOW`), а не размазывается по всему спринту — иначе линия
 * на «Today» стояла выше остатка в плитке.
 */
export function buildDemoBurndownPayload(store: DemoFixtureState) {
  const sprint =
    store.sprints.find((s) => s.id === DEMO_SPRINT_ID) ?? store.sprints[store.sprints.length - 1];
  const goalIds = new Set(store.tasks.filter((t) => t.type === 'goal').map((t) => t.id));
  const scope = computeSprintCompletionScope(store.tasks, goalIds);
  const initialSP = scope.totalScopeSP;
  const initialTP = scope.totalScopeTP;
  const doneSP = scope.completedSP;
  const doneTP = scope.completedTP;
  const currentSP = Math.max(0, initialSP - doneSP);
  const currentTP = Math.max(0, initialTP - doneTP);

  const days = eachDayInclusive(sprint.startDate, sprint.endDate);
  const todayKey = dateKey(DEMO_PLANNER_NOW);
  const todayIndex = Math.max(1, days.findIndex((day) => dateKey(day) === todayKey));
  const dataPoints = days.map((day, index) => {
    const progress = Math.min(1, index / todayIndex);
    return {
      date: day.toISOString(),
      dateKey: dateKey(day),
      remainingSP: Math.max(0, initialSP - doneSP * progress),
      remainingTP: Math.max(0, initialTP - doneTP * progress),
    };
  });

  return {
    currentSP,
    currentTP,
    dailyChangelog: {} as Record<string, never>,
    dataPoints,
    initialSP,
    initialTP,
    sprintInfo: {
      endDate: sprint.endDate,
      name: sprint.name,
      startDate: sprint.startDate,
    },
    sprintTimelineTotals: {
      doneSP,
      doneTP,
      remainingSP: currentSP,
      remainingTP: currentTP,
      totalSP: initialSP,
      totalTP: initialTP,
    },
    testingFlowMode: 'embedded_in_dev' as const,
  };
}

/** Строка кодов в духе isdayoff по дням диапазона: в демо праздников нет, каждый день — `0`. */
export function buildHolidayZeroString(date1: string, date2: string): string {
  return '0'.repeat(eachDayInclusive(date1, date2).length);
}

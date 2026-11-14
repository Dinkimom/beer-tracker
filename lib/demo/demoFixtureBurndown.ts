import type { DemoFixtureState } from './demoFixtureSeed';

import { DEMO_SPRINT_ID } from './demoIds';

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

/** Synthetic burndown curve for the fixture sprint (no tracker changelog). */
export function buildDemoBurndownPayload(store: DemoFixtureState) {
  const sprint =
    store.sprints.find((s) => s.id === DEMO_SPRINT_ID) ?? store.sprints[store.sprints.length - 1];
  const tasks = store.tasks.filter((t) => t.type !== 'goal');
  const initialSP = tasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
  const initialTP = tasks.reduce((sum, t) => sum + (t.testPoints ?? 0), 0);
  const doneSP = tasks
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
  const doneTP = tasks
    .filter((t) => t.status === 'done')
    .reduce((sum, t) => sum + (t.testPoints ?? 0), 0);
  const currentSP = Math.max(0, initialSP - doneSP);
  const currentTP = Math.max(0, initialTP - doneTP);

  const days = eachDayInclusive(sprint.startDate, sprint.endDate);
  const dataPoints = days.map((day, index) => {
    const progress = days.length <= 1 ? 1 : index / (days.length - 1);
    const remainingSP = Math.round(initialSP * (1 - progress * (doneSP / Math.max(initialSP, 1))));
    const remainingTP = Math.round(initialTP * (1 - progress * (doneTP / Math.max(initialTP, 1))));
    return {
      date: day.toISOString(),
      dateKey: dateKey(day),
      remainingSP: Math.max(0, remainingSP),
      remainingTP: Math.max(0, remainingTP),
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

/** Праздники демо: вне дат демо-спринта, чтобы доска спринта не менялась, но квартал их показал (QV5). */
const DEMO_HOLIDAYS = new Set(['2026-11-04', '2026-12-31']);

/** Строка кодов в духе isdayoff по дням диапазона: `0` — рабочий день, `1` — праздник демо. */
export function buildHolidayZeroString(date1: string, date2: string): string {
  return eachDayInclusive(date1, date2)
    .map((day) => (DEMO_HOLIDAYS.has(dateKey(day)) ? '1' : '0'))
    .join('');
}

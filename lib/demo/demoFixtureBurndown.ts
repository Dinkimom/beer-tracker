import type { DemoFixtureState } from './demoFixtureSeed';

import { DEMO_SPRINT_ID } from './demoIds';

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function eachDayInclusive(startIso: string, endIso: string): Date[] {
  const start = new Date(`${startIso}T12:00:00`);
  const end = new Date(`${endIso}T12:00:00`);
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

/** isdayoff-style string of zeros for the inclusive date range. */
export function buildHolidayZeroString(date1: string, date2: string): string {
  const days = eachDayInclusive(date1, date2);
  return '1'.repeat(Math.max(days.length, 1));
}

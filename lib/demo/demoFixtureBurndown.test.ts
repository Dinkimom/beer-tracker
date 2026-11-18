import { describe, expect, it } from 'vitest';

import { computeSprintCompletionScope } from '@/lib/sprints/sprintScoreHelpers';

import { buildDemoBurndownPayload } from './demoFixtureBurndown';
import { createDemoFixtureSeed } from './demoFixtureSeed';
import { DEMO_PLANNER_NOW } from './demoIds';

describe('buildDemoBurndownPayload', () => {
  const store = createDemoFixtureSeed();
  const payload = buildDemoBurndownPayload(store);

  it('считает объём тем же правилом, что плитки и скор ретро: без QA-задач и целей', () => {
    const goalIds = new Set(store.tasks.filter((t) => t.type === 'goal').map((t) => t.id));
    const scope = computeSprintCompletionScope(store.tasks, goalIds);
    expect(payload.initialSP).toBe(scope.totalScopeSP);
    expect(payload.initialTP).toBe(scope.totalScopeTP);
    expect(payload.sprintTimelineTotals.doneTP).toBe(scope.completedTP);
    // QA-задача фикстуры (DEMO-103, 5 tp) в объём не входит.
    const qaTp = store.tasks.filter((t) => t.team === 'QA').reduce((sum, t) => sum + (t.testPoints ?? 0), 0);
    expect(qaTp).toBeGreaterThan(0);
    expect(payload.initialTP).toBe(
      store.tasks
        .filter((t) => t.team !== 'QA' && t.type !== 'goal')
        .reduce((sum, t) => sum + (t.testPoints ?? 0), 0)
    );
  });

  it('на «сегодня» линия остатка равна остатку в плитке и дальше не меняется', () => {
    const y = DEMO_PLANNER_NOW.getFullYear();
    const m = String(DEMO_PLANNER_NOW.getMonth() + 1).padStart(2, '0');
    const d = String(DEMO_PLANNER_NOW.getDate()).padStart(2, '0');
    const todayIndex = payload.dataPoints.findIndex((p) => p.dateKey === `${y}-${m}-${d}`);
    expect(todayIndex).toBeGreaterThan(0);
    expect(payload.dataPoints[0].remainingSP).toBe(payload.initialSP);
    for (const point of payload.dataPoints.slice(todayIndex)) {
      expect(point.remainingSP).toBe(payload.currentSP);
      expect(point.remainingTP).toBe(payload.currentTP);
    }
  });
});

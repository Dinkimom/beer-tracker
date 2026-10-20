/**
 * Демо-история метрик спринтов: двухнедельные спринты до текущего демо-спринта,
 * детерминированные факты с плавным улучшением предсказуемости и потока.
 */

import type {
  BoardSprintMetrics,
  SprintIssueFact,
  SprintMetricsRecord,
  SprintWorkCategory,
} from '@/lib/sprintMetrics/sprintMetricsTypes';

import { resolveMetricsWindowStartMs } from '@/lib/sprintMetrics/aggregateSprintMetrics';

import { DEMO_PLANNER_NOW, DEMO_SPRINT_ID, DEMO_SPRINT_PREV_ID } from './demoIds';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const SPRINT_DAYS = 14;
/** Старт текущего демо-спринта (как в demoFixtureSeed). */
const CURRENT_SPRINT_START_MS = Date.parse('2026-10-13T09:00:00.000Z');
const CURRENT_SPRINT_NUMBER = 15;
const TEAMS = ['Back', 'Web'] as const;
const ESTIMATES = [1, 2, 3, 3, 5, 5, 8] as const;

/** Детерминированный ГПСЧ (mulberry32). */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(random: () => number, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)] as T;
}

function categoryFor(random: () => number, progress: number): SprintWorkCategory {
  const roll = random();
  const bugShare = 0.38 - 0.18 * progress;
  if (roll < bugShare) return 'bug';
  if (roll < bugShare + 0.12) return 'tech';
  if (roll < bugShare + 0.17) return 'other';
  return 'feature';
}

interface DemoIssueInput {
  added: boolean;
  index: number;
  open: boolean;
  progress: number;
  sprintNumber: number;
  random: () => number;
}

function demoFact(input: DemoIssueInput): SprintIssueFact {
  const { random, progress } = input;
  const sp = pick(random, ESTIMATES);
  const doneChance = (input.added ? 0.55 : 0.62) + 0.25 * progress;
  const done = random() < (input.open ? doneChance * 0.4 : doneChance);
  const carriedOver = !input.open && !done && random() < 0.8;
  const coding = 1 + random() * 2;
  const waiting = done ? (3.2 - 1.8 * progress) * (0.5 + random()) : 0;
  return {
    added: input.added,
    carriedOver,
    category: categoryFor(random, progress),
    codingDays: done ? coding : 0,
    committed: !input.added,
    cycleDays: done ? coding + waiting : null,
    declined: false,
    done,
    dwell: done
      ? { readyForTest: waiting * 0.45, review: waiting * 0.35, testing: waiting * 0.2 }
      : {},
    key: `DEMO-${input.sprintNumber}${String(input.index).padStart(2, '0')}`,
    removed: !done && !carriedOver,
    spEnd: sp,
    spStart: sp,
    team: pick(random, TEAMS),
    tpEnd: done ? Math.round(sp / 2) : 0,
    waitingDays: waiting,
  };
}

/** Имена как в сиде для двух последних спринтов, у истории — номер спринта в году. */
function demoSprintName(sprintNumber: number, startMs: number): string {
  if (sprintNumber === CURRENT_SPRINT_NUMBER) return 'Sprint 15 — Checkout';
  if (sprintNumber === CURRENT_SPRINT_NUMBER - 1) return 'Sprint 14';
  const start = new Date(startMs);
  const dayOfYear = Math.floor((startMs - Date.UTC(start.getUTCFullYear(), 0, 1)) / MS_PER_DAY);
  const yearShort = String(start.getUTCFullYear()).slice(2);
  return `Sprint ${yearShort}.${String(Math.floor(dayOfYear / SPRINT_DAYS) + 1).padStart(2, '0')}`;
}

function sprintIdFor(sprintNumber: number): number {
  if (sprintNumber === CURRENT_SPRINT_NUMBER) return DEMO_SPRINT_ID;
  if (sprintNumber === CURRENT_SPRINT_NUMBER - 1) return DEMO_SPRINT_PREV_ID;
  return 1000 + sprintNumber;
}

function demoRecord(sprintNumber: number, startMs: number, progress: number, nowMs: number): SprintMetricsRecord {
  const random = seededRandom(sprintNumber * 7919);
  const endMs = startMs + (SPRINT_DAYS - 3) * MS_PER_DAY + 9 * 60 * 60 * 1000;
  const open = nowMs < endMs;
  const committedCount = 9 + Math.floor(random() * 4);
  const addedCount = Math.max(1, Math.round((5 - 3 * progress) * random()) + 1);
  const facts = Array.from({ length: committedCount + addedCount }, (_, index) =>
    demoFact({ added: index >= committedCount, index, open, progress, random, sprintNumber })
  );
  const goalsTotal = 3;
  return {
    computedAt: new Date(nowMs).toISOString(),
    endDate: new Date(endMs).toISOString(),
    facts,
    frozen: !open,
    goals: { done: open ? 1 : Math.min(goalsTotal, Math.round(1 + 2 * progress + random() * 0.6)), total: goalsTotal },
    name: demoSprintName(sprintNumber, startMs),
    open,
    sprintId: sprintIdFor(sprintNumber),
    startDate: new Date(startMs).toISOString(),
  };
}

export function buildDemoBoardSprintMetrics(quarters: number): BoardSprintMetrics {
  const nowMs = DEMO_PLANNER_NOW.getTime();
  const windowStartMs = resolveMetricsWindowStartMs(quarters, nowMs);
  const sprintCount = Math.floor((CURRENT_SPRINT_START_MS - windowStartMs) / (SPRINT_DAYS * MS_PER_DAY)) + 1;
  const records = Array.from({ length: sprintCount }, (_, offset) => {
    const back = sprintCount - 1 - offset;
    const startMs = CURRENT_SPRINT_START_MS - back * SPRINT_DAYS * MS_PER_DAY;
    // Прогресс от 8 кварталов назад: история одинакова при любом выбранном периоде.
    const progress = Math.min(1, Math.max(0, 1 - back / 52));
    return demoRecord(CURRENT_SPRINT_NUMBER - back, startMs, progress, nowMs);
  });
  return {
    pending: 0,
    records,
    windowStart: new Date(windowStartMs).toISOString(),
  };
}

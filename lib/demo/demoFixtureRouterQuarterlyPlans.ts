import type { DemoFixtureResult } from './demoFixtureRouterTypes';
import type {
  QuarterlyPlanContent,
  QuarterNumber,
  QuarterRef,
} from '@/lib/quarterlyPlans/quarterlyPlanTypes';
import type { BoardAvailabilityEvent } from '@/types/quarterly';

import { getDemoFixtureStore } from './demoFixtureStore';
import {
  buildDemoQuarterlyPlan,
  buildDemoQuarterlyPlanContent,
  DEMO_TRACKER_EPICS,
} from './demoQuarterlyPlanSeed';

const AVAILABILITY_PATH = '/quarterly-plans/availability/board-events';

function ok(data: unknown): DemoFixtureResult {
  return { data, status: 200 };
}

function quarterKey({ quarter, year }: QuarterRef): string {
  return `${year}-Q${quarter}`;
}

/** Содержимое и версия плана квартала; заполненный сид считается первым сохранением. */
function readStored(ref: QuarterRef): { content: QuarterlyPlanContent; version: number } {
  const store = getDemoFixtureStore();
  const key = quarterKey(ref);
  store.quarterlyPlans[key] ??= { content: buildDemoQuarterlyPlanContent(ref), version: 1 };
  return store.quarterlyPlans[key];
}

function handlePlan(method: string, params: URLSearchParams, body: unknown): DemoFixtureResult | null {
  if (method === 'get') {
    const ref: QuarterRef = {
      quarter: Number(params.get('quarter') ?? 4) as QuarterNumber,
      year: Number(params.get('year') ?? 2026),
    };
    const { content, version } = readStored(ref);
    return ok({ plan: buildDemoQuarterlyPlan(ref, content, getDemoFixtureStore().developers), version });
  }
  if (method === 'put') {
    // Тот же контракт, что у /api/quarterly-plans: запись поверх версии, которую видел клиент (QS5).
    const { content, ifVersion, quarter, year } = body as QuarterRef & { content: QuarterlyPlanContent; ifVersion: number };
    const ref = { quarter, year };
    const stored = readStored(ref);
    if (stored.version !== ifVersion) {
      return { data: { error: 'Quarterly plan was changed by someone else' }, status: 409 };
    }
    const { assignments, directions, epics, links, notes } = content;
    getDemoFixtureStore().quarterlyPlans[quarterKey(ref)] = {
      content: { assignments, directions, epics, links, notes },
      version: stored.version + 1,
    };
    return ok({ version: stored.version + 1 });
  }
  return null;
}

/** Создание, правка и удаление отсутствий: одно хранилище для спринта и для квартала. */
function handleAvailabilityMutation(
  method: string,
  params: URLSearchParams,
  body: unknown
): DemoFixtureResult | null {
  const store = getDemoFixtureStore();
  if (method === 'delete') {
    const id = params.get('id');
    store.availabilityEvents = store.availabilityEvents.filter((event) => event.id !== id);
    return ok({ deleted: 1, success: true });
  }
  if (method !== 'post' && method !== 'patch') return null;
  const input = body as BoardAvailabilityEvent;
  const event: BoardAvailabilityEvent = {
    endDate: input.endDate,
    eventType: input.eventType,
    id: method === 'patch' ? input.id : `demo-availability-${Date.now()}`,
    memberId: input.memberId,
    memberName: input.memberName,
    startDate: input.startDate,
  };
  store.availabilityEvents = [
    ...store.availabilityEvents.filter((existing) => existing.id !== event.id),
    event,
  ];
  return ok(event);
}

/** Поиск эпиков для привязки: тот же `/issues/search`, что у пикера родителя. */
function handleEpicSearch(params: URLSearchParams): DemoFixtureResult {
  const query = (params.get('q') ?? '').trim().toLowerCase();
  const template = getDemoFixtureStore().tasks[0]!;
  const items = DEMO_TRACKER_EPICS.filter((epic) =>
    `${epic.issueKey} ${epic.title}`.toLowerCase().includes(query)
  ).map((epic) => ({
    key: epic.issueKey,
    summary: epic.title,
    task: { ...template, id: epic.issueKey, name: epic.title, parent: undefined, type: 'epic' },
  }));
  return ok({ items });
}

export function handleDemoQuarterlyPlans(
  path: string,
  method: string,
  params: URLSearchParams,
  body: unknown
): DemoFixtureResult | null {
  if (path === '/quarterly-plans') return handlePlan(method, params, body);
  if (path === AVAILABILITY_PATH) return handleAvailabilityMutation(method, params, body);
  if (path === '/issues/search' && method === 'get' && params.get('parentCandidates') === '1') {
    return handleEpicSearch(params);
  }
  return null;
}

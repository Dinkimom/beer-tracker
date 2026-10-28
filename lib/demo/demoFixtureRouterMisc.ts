import type { DemoFixtureResult } from './demoFixtureRouterTypes';

import { buildHolidayZeroString } from './demoFixtureBurndown';
import { buildDemoIssueChangelogs } from './demoFixtureChangelog';
import { getDemoFixtureStore } from './demoFixtureStore';

function ok(data: unknown, status = 200): DemoFixtureResult {
  return { data, status };
}

function notFound(message = 'Not found'): DemoFixtureResult {
  return { data: { error: message }, status: 404 };
}

function handleIssueByKey(path: string): DemoFixtureResult {
  const store = getDemoFixtureStore();
  const key = path.split('/')[2];
  const found = [...store.tasks, ...store.backlogTasks].find((t) => t.id === key);
  if (found) return ok(found);
  return notFound();
}

/** Связь трекера между задачами: без `link` в ответе планер откатывает стрелку. */
function handleCreateIssueLink(path: string, body: unknown): DemoFixtureResult {
  const key = path.split('/')[2];
  const target = (body as { targetIssueKey?: string } | null)?.targetIssueKey ?? '';
  return ok({
    link: {
      direction: 'outward',
      id: `demo-link-${key}-${target}`,
      linkedIssueKey: target,
      relationship: 'relates',
    },
  });
}

function handleIssues(path: string, method: string, body: unknown): DemoFixtureResult | null {
  if (!path.startsWith('/issues/')) return null;
  if (method === 'post' && /^\/issues\/[^/]+\/links$/.test(path)) {
    return handleCreateIssueLink(path, body);
  }
  if (path === '/issues/changelog' && method === 'post') {
    return ok(buildDemoIssueChangelogs());
  }
  if (path === '/issues/parent-statuses' && method === 'get') {
    return ok({ statuses: {} });
  }
  if (method === 'get') return handleIssueByKey(path);
  if (method === 'patch' || method === 'post' || method === 'put') {
    return ok({ success: true });
  }
  return null;
}

const EMPTY_PREFIX_HANDLERS: Array<{
  match: (path: string) => boolean;
  response: unknown;
}> = [
  { match: (p) => p.startsWith('/users/'), response: { display: 'Demo User', id: 'demo-user' } },
  { match: (p) => p.startsWith('/queues/'), response: { types: [], key: 'DEMO', name: 'Demo' } },
  { match: (p) => p.startsWith('/screens/'), response: { fields: [] } },
];

function handleQuarterlyAndNotifications(path: string, method: string): DemoFixtureResult | null {
  if (path.startsWith('/quarterly-plans/') && method === 'get') {
    if (path.includes('availability')) {
      return ok({ events: getDemoFixtureStore().availabilityEvents });
    }
    return ok({ plan: null, features: [] });
  }
  if (path === '/release-horoscope/day' && method === 'get') return ok(null);
  if (path.startsWith('/notifications') && method === 'get') {
    return ok({ notifications: [], unreadCount: 0 });
  }
  if (path.startsWith('/notifications')) return ok({ ok: true });
  return null;
}

function handleEmptyCollections(path: string, method: string): DemoFixtureResult | null {
  const early = handleQuarterlyAndNotifications(path, method);
  if (early) return early;
  if (path === '/auth/myself' && method === 'get') {
    return ok({
      id: 'demo-user',
      display: 'Demo User',
      email: 'demo@beer-tracker.local',
    });
  }
  for (const handler of EMPTY_PREFIX_HANDLERS) {
    if (handler.match(path)) return ok(handler.response);
  }
  return null;
}

export function handleDemoMisc(
  path: string,
  method: string,
  params: URLSearchParams,
  body: unknown
): DemoFixtureResult | null {
  if (path === '/holidays/isdayoff' && method === 'get') {
    const date1 = params.get('date1') ?? '2026-10-13';
    const date2 = params.get('date2') ?? '2026-10-24';
    return ok(buildHolidayZeroString(date1, date2));
  }
  if (path === '/realtime/presence' && method === 'put') return ok({ applied: true });
  if (path === '/analytics/events' && method === 'post') return ok({ ok: true });

  return handleIssues(path, method, body) ?? handleEmptyCollections(path, method);
}

import type { DemoFixtureResult } from './demoFixtureRouterTypes';
import type { InternalAxiosRequestConfig } from 'axios';

import { defaultRetroColumnTemplate } from '@/lib/retro/retroBoard';

import { buildDemoBurndownPayload } from './demoFixtureBurndown';
import { handleDemoMisc } from './demoFixtureRouterMisc';
import { handleDemoPositions } from './demoFixtureRouterPositions';
import { demoPlannerIntegrationRules } from './demoFixtureSeed';
import {
  getDemoFixtureStore,
  replaceDemoFeatureLanes,
  replaceDemoRetroBoard,
} from './demoFixtureStore';
import { DEMO_BOARD_ID, DEMO_ORG_ID, DEMO_SPRINT_ID } from './demoIds';

function parseBody(config: InternalAxiosRequestConfig): unknown {
  const raw = config.data;
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return raw;
    }
  }
  return raw;
}

function queryParams(config: InternalAxiosRequestConfig): URLSearchParams {
  const params = new URLSearchParams();
  const url = config.url ?? '';
  const q = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  if (q) {
    new URLSearchParams(q).forEach((v, k) => params.set(k, v));
  }
  const raw = config.params;
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (v == null) continue;
      params.set(k, String(v));
    }
  }
  return params;
}

function joinBaseAndUrl(base: string, url: string): string {
  if (url.startsWith('http')) {
    return new URL(url).pathname;
  }
  const prefix = url.startsWith('/') ? '' : '/';
  return `${base}${prefix}${url}`;
}

function resolvePath(config: InternalAxiosRequestConfig): string {
  const base = (config.baseURL ?? '').replace(/\/$/, '');
  let url = config.url ?? '';
  if (url.includes('?')) url = url.slice(0, url.indexOf('?'));
  let full = joinBaseAndUrl(base, url);
  if (full.startsWith('/api/demo')) {
    full = full.slice('/api/demo'.length) || '/';
  }
  if (!full.startsWith('/')) full = `/${full}`;
  return full.replace(/\/+/g, '/');
}

function ok(data: unknown, status = 200): DemoFixtureResult {
  return { data, status };
}

function notFound(message = 'Not found'): DemoFixtureResult {
  return { data: { error: message }, status: 404 };
}

function matchSprintId(path: string, suffix: string): number | null {
  const re = new RegExp(`^/sprints/(\\d+)/${suffix}$`);
  const m = path.match(re);
  return m ? Number(m[1]) : null;
}

function handleAuthSession(): DemoFixtureResult {
  const store = getDemoFixtureStore();
  return ok({
    user: {
      id: 'demo-user',
      email: 'demo@beer-tracker.local',
      emailVerified: true,
    },
    organizations: [
      {
        id: store.orgId,
        name: 'Demo Organization',
        slug: 'demo',
        role: 'org_admin',
        canAccessAdmin: false,
        canUsePlanner: true,
        managedTeamIds: null,
        issueTracker: null,
      },
    ],
  });
}

function handleBoards(path: string, method: string): DemoFixtureResult | null {
  const store = getDemoFixtureStore();
  if (path === '/boards' && method === 'get') {
    return ok([store.board]);
  }
  const boardMatch = path.match(/^\/boards\/(\d+)$/);
  if (boardMatch && method === 'get') {
    const id = Number(boardMatch[1]);
    if (id !== DEMO_BOARD_ID) return notFound();
    return ok(store.boardParams);
  }
  return null;
}

function handleSprintsList(path: string, method: string, params: URLSearchParams): DemoFixtureResult | null {
  const store = getDemoFixtureStore();
  if (path === '/sprints' && method === 'get') {
    const boardId = Number(params.get('boardId') ?? DEMO_BOARD_ID);
    if (boardId !== DEMO_BOARD_ID) return ok([]);
    return ok(store.sprints);
  }
  if (path === '/sprints/assignee-velocity' && method === 'get') {
    return ok(store.assigneeVelocity);
  }
  return null;
}

function handleTracker(path: string, method: string, params: URLSearchParams): DemoFixtureResult | null {
  if (path !== '/tracker' || method !== 'get') return null;
  const store = getDemoFixtureStore();
  const sprintId = Number(params.get('sprintId') ?? DEMO_SPRINT_ID);
  const sprint = store.sprints.find((s) => s.id === sprintId);
  return ok({
    developers: store.developers,
    sprintInfo: sprint
      ? {
          id: sprint.id,
          name: sprint.name,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          startDateTime: sprint.startDateTime,
          endDateTime: sprint.endDateTime,
          status: sprint.status,
          version: sprint.version,
        }
      : store.sprintInfo,
    tasks: store.tasks,
  });
}

function handleBacklog(path: string, method: string, params: URLSearchParams): DemoFixtureResult | null {
  if (path !== '/backlog' || method !== 'get') return null;
  const store = getDemoFixtureStore();
  const page = Number(params.get('page') ?? 1);
  const perPage = Number(params.get('perPage') ?? 50);
  const tasks = store.backlogTasks;
  return ok({
    developers: store.developers,
    pagination: {
      page,
      perPage,
      totalCount: tasks.length,
      totalPages: 1,
    },
    tasks,
  });
}

function handleSprintGoals(
  path: string,
  method: string,
  params: URLSearchParams,
  body: unknown
): DemoFixtureResult | null {
  const store = getDemoFixtureStore();
  if (path === '/sprint-goals' && method === 'get') {
    const goalType = params.get('goalType') === 'discovery' ? 'discovery' : 'delivery';
    const items = store.goals[goalType];
    const checklistDone = items.filter((i) => i.checked).length;
    return ok({
      checklistDone,
      checklistItems: items,
      checklistTotal: items.length,
    });
  }
  if (path === '/sprint-goals' && method === 'post') {
    return ok({ success: true, item: body });
  }
  if (path.startsWith('/sprint-goals/') && (method === 'patch' || method === 'delete')) {
    return ok({ success: true });
  }
  return null;
}

function handleLinks(path: string, method: string): DemoFixtureResult | null {
  const store = getDemoFixtureStore();
  if (path.match(/^\/sprints\/\d+\/links$/) && method === 'get') {
    return ok({ links: store.links });
  }
  if (path.match(/^\/sprints\/\d+\/links$/) && (method === 'post' || method === 'delete' || method === 'patch')) {
    return ok({ success: true });
  }
  if (path.match(/^\/sprints\/\d+\/links\/batch$/) && method === 'post') {
    return ok({ success: true });
  }
  if (path.match(/^\/sprints\/\d+\/links\/clear$/) && method === 'delete') {
    return ok({ success: true });
  }
  return null;
}

function handleComments(path: string, method: string): DemoFixtureResult | null {
  const store = getDemoFixtureStore();
  if (path.match(/^\/sprints\/\d+\/comments$/) && method === 'get') {
    return ok({ comments: store.comments });
  }
  if (path.includes('/comments')) {
    return ok({ success: true, comment: { id: `demo-comment-${Date.now()}` } });
  }
  return null;
}

function handleRetro(path: string, method: string, body: unknown): DemoFixtureResult | null {
  const sprintId = matchSprintId(path, 'retro');
  if (sprintId == null) return null;
  const store = getDemoFixtureStore();
  if (method === 'get') {
    return ok({ board: store.retroBoards[String(sprintId)] ?? null });
  }
  if (method === 'put') {
    const payload = body as { board?: (typeof store.retroBoards)[string] } | undefined;
    if (payload?.board) {
      replaceDemoRetroBoard(sprintId, payload.board);
      return ok({ board: payload.board });
    }
    return ok({ board: store.retroBoards[String(sprintId)] ?? null });
  }
  return null;
}

function handleFeatureLanes(path: string, method: string, body: unknown): DemoFixtureResult | null {
  const sprintId = matchSprintId(path, 'feature-lanes');
  if (sprintId == null) return null;
  const store = getDemoFixtureStore();
  if (method === 'get') {
    return ok({ lanes: store.featureLanes });
  }
  if (method === 'put') {
    const lanes = body as typeof store.featureLanes;
    if (lanes) replaceDemoFeatureLanes(lanes);
    return ok({ success: true });
  }
  return null;
}

function handleSprintExtras(path: string, method: string): DemoFixtureResult | null {
  const store = getDemoFixtureStore();
  if (matchSprintId(path, 'burndown') != null && method === 'get') {
    return ok(buildDemoBurndownPayload(store));
  }
  if (matchSprintId(path, 'score') != null && method === 'get') {
    return ok(store.score);
  }
  if (matchSprintId(path, 'occupancy-task-order') != null) {
    if (method === 'get') return ok({ order: null });
    return ok({ success: true });
  }
  return null;
}

function handleTeamsAndRules(path: string, method: string): DemoFixtureResult | null {
  const store = getDemoFixtureStore();
  if (path === '/teams/members' && method === 'get') {
    return ok({ developers: store.developers });
  }
  if (path === '/planner-integration-rules' && method === 'get') {
    return ok(demoPlannerIntegrationRules());
  }
  if (path.match(/^\/organizations\/[^/]+\/planner-integration-rules$/) && method === 'get') {
    return ok(demoPlannerIntegrationRules());
  }
  if (path.match(/^\/organizations\/[^/]+\/retro-template$/) && method === 'get') {
    return ok({ columns: defaultRetroColumnTemplate(), updatedAt: null });
  }
  return null;
}

/**
 * In-memory handler for all `/api/demo/**` calls from the fixture axios adapter.
 */
export function handleDemoFixtureRequest(config: InternalAxiosRequestConfig): DemoFixtureResult {
  const method = (config.method ?? 'get').toLowerCase();
  const path = resolvePath(config);
  const params = queryParams(config);
  const body = parseBody(config);

  if (path === '/auth/session' && method === 'get') {
    return handleAuthSession();
  }

  const handlers: Array<() => DemoFixtureResult | null> = [
    () => handleBoards(path, method),
    () => handleSprintsList(path, method, params),
    () => handleTracker(path, method, params),
    () => handleBacklog(path, method, params),
    () => handleSprintGoals(path, method, params, body),
    () => handleDemoPositions(path, method, params, body),
    () => handleLinks(path, method),
    () => handleComments(path, method),
    () => handleRetro(path, method, body),
    () => handleFeatureLanes(path, method, body),
    () => handleSprintExtras(path, method),
    () => handleTeamsAndRules(path, method),
    () => handleDemoMisc(path, method, params),
  ];

  for (const run of handlers) {
    const result = run();
    if (result) return result;
  }

  if (method !== 'get') {
    return ok({ success: true, demo: true, path });
  }
  return ok({ demo: true, orgId: DEMO_ORG_ID, path });
}

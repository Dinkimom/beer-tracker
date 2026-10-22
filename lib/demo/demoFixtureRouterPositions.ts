import type { DemoFixtureResult } from './demoFixtureRouterTypes';

import {
  getDemoFixtureStore,
  getDemoSprintTasks,
  removeDemoPosition,
  replaceDemoPositions,
  upsertDemoPosition,
} from './demoFixtureStore';
import { DEMO_SPRINT_NEXT_ID } from './demoIds';

function ok(data: unknown, status = 200): DemoFixtureResult {
  return { data, status };
}

function matchSprintId(path: string, suffix: string): number | null {
  const re = new RegExp(`^/sprints/(\\d+)/${suffix}$`);
  const m = path.match(re);
  return m ? Number(m[1]) : null;
}

function applyPositionBody(body: unknown): void {
  const row = body as Record<string, unknown> | undefined;
  if (!row || typeof row.taskId !== 'string') return;
  upsertDemoPosition({
    task_id: row.taskId,
    assignee_id: String(row.assignee ?? row.assigneeId ?? ''),
    start_day: Number(row.startDay ?? 0),
    start_part: Number(row.startPart ?? 0),
    duration: Number(row.duration ?? 1),
    is_qa: Boolean(row.isQa),
    planned_duration: row.plannedDuration == null ? null : Number(row.plannedDuration),
    planned_start_day: row.plannedStartDay == null ? null : Number(row.plannedStartDay),
    planned_start_part: row.plannedStartPart == null ? null : Number(row.plannedStartPart),
  });
}

function handlePositionsAliases(path: string, method: string): DemoFixtureResult | null {
  if (path.match(/^\/sprints\/\d+\/positions\/batch$/) && method === 'post') {
    return ok({ success: true });
  }
  if (path.match(/^\/sprints\/\d+\/positions\/clear$/) && method === 'delete') {
    replaceDemoPositions([]);
    return ok({ success: true });
  }
  return null;
}

/** Позиции общие на фикстуру; следующему спринту отдаём только его задачи и без якорей плана. */
function readSprintPositions(sprintId: number): DemoFixtureResult {
  const store = getDemoFixtureStore();
  if (sprintId !== DEMO_SPRINT_NEXT_ID) {
    return ok({ planAnchors: store.planAnchors, positions: store.positions });
  }
  const taskIds = new Set(getDemoSprintTasks(sprintId).map((t) => t.id));
  return ok({ planAnchors: [], positions: store.positions.filter((p) => taskIds.has(p.task_id)) });
}

function handlePositionsCrud(
  sprintId: number,
  method: string,
  params: URLSearchParams,
  body: unknown
): DemoFixtureResult | null {
  if (method === 'get') return readSprintPositions(sprintId);
  if (method === 'post') {
    applyPositionBody(body);
    return ok({ success: true });
  }
  if (method === 'delete') {
    const taskId = params.get('taskId');
    if (taskId) {
      removeDemoPosition(taskId, params.get('isQa') === '1' ? true : undefined);
    }
    return ok({ success: true });
  }
  return null;
}

export function handleDemoPositions(
  path: string,
  method: string,
  params: URLSearchParams,
  body: unknown
): DemoFixtureResult | null {
  const alias = handlePositionsAliases(path, method);
  if (alias) return alias;

  const sprintId = matchSprintId(path, 'positions');
  if (sprintId == null) return null;
  return handlePositionsCrud(sprintId, method, params, body);
}

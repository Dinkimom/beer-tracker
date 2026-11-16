import type { DemoFixtureResult } from './demoFixtureRouterTypes';

import {
  getDemoFixtureStore,
  getDemoSprintTasks,
  removeDemoPosition,
  replaceDemoPositions,
  upsertDemoPosition,
  writeDemoLaneLayers,
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

function demoLaneLayers(): Array<{ cardId: string; layer: number; rev: number }> {
  return Object.entries(getDemoFixtureStore().laneLayers).map(([cardId, layer]) => ({
    cardId,
    layer,
    rev: 0,
  }));
}

function handleLaneLayersWrite(path: string, method: string, body: unknown): DemoFixtureResult | null {
  if (!path.match(/^\/sprints\/\d+\/lane-layers$/) || method !== 'put') {
    return null;
  }
  const layers = (body as { layers?: unknown } | undefined)?.layers;
  if (Array.isArray(layers)) {
    writeDemoLaneLayers(
      layers.filter(
        (item): item is { cardId: string; layer: number | null } =>
          typeof item?.cardId === 'string' && (item.layer === null || typeof item.layer === 'number')
      )
    );
  }
  return ok({ success: true });
}

/** Позиция из батча доски: тот же контракт, что `/sprints/:id/positions/batch`. */
interface DemoBatchPosition {
  assigneeId: string;
  duration: number;
  isQa?: boolean;
  plannedDuration?: number | null;
  plannedStartDay?: number | null;
  plannedStartPart?: number | null;
  startDay: number;
  startPart: number;
  taskId: string;
}

function handlePositionsAliases(path: string, method: string, body: unknown): DemoFixtureResult | null {
  if (path.match(/^\/sprints\/\d+\/positions\/batch$/) && method === 'post') {
    // Батч ложится в общие позиции фикстуры: доска и квартал (карточки спринта, QK8) видят новое место.
    for (const position of (body as { positions?: DemoBatchPosition[] } | undefined)?.positions ?? []) {
      upsertDemoPosition({
        assignee_id: position.assigneeId,
        duration: position.duration,
        is_qa: position.isQa ?? false,
        planned_duration: position.plannedDuration ?? null,
        planned_start_day: position.plannedStartDay ?? null,
        planned_start_part: position.plannedStartPart ?? null,
        start_day: position.startDay,
        start_part: position.startPart,
        task_id: position.taskId,
      });
    }
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
    return ok({ laneLayers: demoLaneLayers(), planAnchors: store.planAnchors, positions: store.positions });
  }
  const taskIds = new Set(getDemoSprintTasks(sprintId).map((t) => t.id));
  return ok({
    laneLayers: demoLaneLayers(),
    planAnchors: [],
    positions: store.positions.filter((p) => taskIds.has(p.task_id)),
  });
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
  const alias = handlePositionsAliases(path, method, body) ?? handleLaneLayersWrite(path, method, body);
  if (alias) return alias;

  const sprintId = matchSprintId(path, 'positions');
  if (sprintId == null) return null;
  return handlePositionsCrud(sprintId, method, params, body);
}

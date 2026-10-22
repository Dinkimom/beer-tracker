import type { DemoFixtureResult } from './demoFixtureRouterTypes';

import { getDemoFixtureStore, moveDemoIssueToSprint } from './demoFixtureStore';

function ok(data: unknown, status = 200): DemoFixtureResult {
  return { data, status };
}

function moveResult(issueKey: string, sprintId: number | null): DemoFixtureResult {
  if (sprintId != null && !getDemoFixtureStore().sprints.some((s) => s.id === sprintId)) {
    return ok({ error: 'Sprint not found' }, 404);
  }
  return moveDemoIssueToSprint(issueKey, sprintId)
    ? ok({ success: true })
    : ok({ error: 'Issue not found' }, 404);
}

/**
 * Спринт задачи в `/demo/planner`: POST — в спринт, DELETE и PATCH `{ sprint: [] }` — в бэклог.
 */
export function handleDemoIssueSprint(
  path: string,
  method: string,
  body: unknown
): DemoFixtureResult | null {
  const match = path.match(/^\/issues\/([^/]+)\/sprint$/);
  if (!match) return null;
  const issueKey = match[1];
  if (method === 'post') {
    const sprintId = Number((body as { sprintId?: unknown } | undefined)?.sprintId);
    return Number.isFinite(sprintId) ? moveResult(issueKey, sprintId) : ok({ error: 'sprintId' }, 400);
  }
  if (method === 'delete' || method === 'patch') {
    return moveResult(issueKey, null);
  }
  return null;
}

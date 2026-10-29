import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';
import type {
  SprintPlanPatchApplyOpResult,
  SprintPlanPatchOp,
} from '@/lib/sprints/sprintPlanPatchTypes';

import { invalidateCache } from '@/lib/cache';
import { completeIssueSprintMembershipChange } from '@/lib/issues/issueSprintMembershipRealtime';
import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { resolvePlannerAssigneeIdForTrackerSync } from '@/lib/staffTeams/resolvePlannerAssigneeForTrackerSync';
import { TENANT_ORG_HEADER } from '@/lib/tenantHttpConstants';

/** Soft: keys currently on the tracker sprint board (best-effort). */
export async function loadSprintIssueKeySet(input: {
  organizationId: string;
  sprintId: number;
  sprintStatus?: string;
}): Promise<{ keys: Set<string>; warning?: string }> {
  try {
    const issueTracker = await getIssueTrackerProviderClientForOrganization(
      input.organizationId
    );
    const issues = await issueTracker.getTasksInSprintWithParents(input.sprintId, {
      sprintStatus: input.sprintStatus,
    });
    const keys = new Set(
      issues.map((issue) => issue.key?.trim()).filter((key): key is string => Boolean(key))
    );
    return { keys };
  } catch (error) {
    console.warn(`[sprint-plan-patch] list sprint issues(${input.sprintId}):`, error);
    return {
      keys: new Set(),
      warning: `tracker_sprint_issues_unavailable: could not check sprint membership for ${input.sprintId}`,
    };
  }
}

export function collectIssueNotInSprintWarnings(
  ops: SprintPlanPatchOp[],
  sprintIssueKeys: ReadonlySet<string>
): string[] {
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const op of ops) {
    if (op.op !== 'upsertPosition') {
      continue;
    }
    const taskId = op.taskId.trim();
    if (!taskId || seen.has(taskId) || sprintIssueKeys.has(taskId)) {
      continue;
    }
    seen.add(taskId);
    warnings.push(`issue_not_in_sprint: ${taskId}`);
  }
  return warnings;
}

function missingSprintTaskIds(warnings: readonly string[]): string[] {
  const missingIds: string[] = [];
  for (const warning of warnings) {
    const match = /^issue_not_in_sprint:\s*(\S+)/.exec(warning);
    if (match?.[1]) {
      missingIds.push(match[1]);
    }
  }
  return missingIds;
}

function tasksNeedingTrackerSync(
  ops: readonly SprintPlanPatchOp[],
  taskIds: readonly string[]
): string[] {
  return taskIds.filter((taskId) =>
    ops.some(
      (op) => op.op === 'upsertPosition' && op.taskId.trim() === taskId && !op.syncToTracker
    )
  );
}

function hintForOffPlanner(taskIds: readonly string[]): string {
  return `issue_not_in_sprint (${taskIds.join(', ')}): not on the planner yet. Re-propose those upsertPosition ops with syncToTracker:true to add the issue to the tracker sprint. You may set segments on the same op to place an already-split task in one step, then apply with the new applyToken.`;
}

function hintForOnPlanner(taskIds: readonly string[]): string {
  return `issue_not_in_sprint (${taskIds.join(', ')}): already on the planner. The position change still applies without syncToTracker. Set syncToTracker=true on those upsertPosition ops only if you also want to add them to the Tracker sprint and assign.`;
}

/** Agent-facing remediation when propose flagged issues missing from the tracker sprint. */
export function buildIssueNotInSprintPlanPatchHints(
  ops: readonly SprintPlanPatchOp[],
  warnings: readonly string[],
  placedTaskIds?: ReadonlySet<string>
): string[] {
  const needsSync = tasksNeedingTrackerSync(ops, missingSprintTaskIds(warnings));
  if (needsSync.length === 0) {
    return [];
  }
  const onPlanner = needsSync.filter((taskId) => placedTaskIds?.has(taskId) === true);
  const offPlanner = needsSync.filter((taskId) => !onPlanner.includes(taskId));
  const hints: string[] = [];
  if (offPlanner.length > 0) {
    hints.push(hintForOffPlanner(offPlanner));
  }
  if (onPlanner.length > 0) {
    hints.push(hintForOnPlanner(onPlanner));
  }
  return hints;
}

/**
 * addIssueToSprint → `beforePublish` (например, назначить исполнителя) → сброс кэша бэклога
 * и realtime о смене спринта. Realtime последним, чтобы вкладки перечитали задачу уже целиком.
 */
async function addIssueToTrackerSprint(input: {
  beforePublish?: (issueTracker: IssueTrackerProviderClient) => Promise<void>;
  organizationId: string;
  sprintId: number;
  taskId: string;
}): Promise<void> {
  const { sprintId, taskId } = input;
  const issueTracker = await getIssueTrackerProviderClientForOrganization(input.organizationId);
  const membership = await issueTracker.addIssueToSprint(taskId, sprintId);
  await input.beforePublish?.(issueTracker);
  for (const boardId of membership.backlogBoardIds) {
    invalidateCache.backlog(boardId);
  }
  // Без client id: событие получают все вкладки, включая ту, что подтвердила превью.
  await completeIssueSprintMembershipChange({
    addedSprintIds: [sprintId],
    issueKey: taskId,
    issueTracker,
    removedSprintIds: membership.affectedSprintIds.filter((id) => id !== sprintId),
    request: new Request('http://localhost/api/mcp', {
      headers: { [TENANT_ORG_HEADER]: input.organizationId },
    }),
  });
}

function trackerSyncFailed(taskId: string, error: unknown): { warning: string } {
  const message = error instanceof Error ? error.message : String(error);
  return { warning: `tracker_sync_failed: ${taskId}: ${message}` };
}

async function addAndAssignInTracker(input: {
  assigneeId: string;
  organizationId: string;
  sprintId: number;
  taskId: string;
}): Promise<{ detail?: string; warning?: string }> {
  let trackerAssigneeId: string | null = null;
  await addIssueToTrackerSprint({
    ...input,
    beforePublish: async (issueTracker) => {
      trackerAssigneeId = await resolvePlannerAssigneeIdForTrackerSync(
        input.organizationId,
        input.assigneeId
      );
      if (trackerAssigneeId) {
        await issueTracker.updateIssue(input.taskId, { assigneeId: trackerAssigneeId });
      }
    },
  });
  if (!trackerAssigneeId) {
    return {
      detail: `tracker sync: added ${input.taskId} to sprint ${input.sprintId}`,
      warning: `tracker_assignee_unresolved: ${input.assigneeId}`,
    };
  }
  return {
    detail: `tracker sync: added ${input.taskId} to sprint ${input.sprintId}, assigned ${trackerAssigneeId}`,
  };
}

/** After BT position write: optionally add to tracker sprint and assign. Errors are returned, not thrown. */
export async function syncUpsertPositionToTracker(input: {
  assigneeId: string;
  organizationId: string;
  sprintId: number;
  taskId: string;
}): Promise<{ detail?: string; warning?: string }> {
  try {
    return await addAndAssignInTracker(input);
  } catch (error) {
    return trackerSyncFailed(input.taskId, error);
  }
}

/**
 * Синк в трекер: выполняется после коммита транзакции, его нельзя откатить.
 * С assigneeId — upsertPosition.syncToTracker, с moveToSprintId — перенос задачи в другой спринт.
 */
export type PlanPatchTrackerSyncRequest =
  { assigneeId: string; index: number; taskId: string } | { index: number; moveToSprintId: number; taskId: string };

/** Ошибки трекера возвращаются предупреждением: изменения в BT уже закоммичены. */
async function runOneTrackerSync(input: {
  organizationId: string;
  request: PlanPatchTrackerSyncRequest;
  sprintId: number;
}): Promise<{ detail?: string; warning?: string }> {
  const { request } = input;
  if (!('moveToSprintId' in request)) {
    return syncUpsertPositionToTracker({
      assigneeId: request.assigneeId,
      organizationId: input.organizationId,
      sprintId: input.sprintId,
      taskId: request.taskId,
    });
  }
  try {
    // Как «Перенести в спринт» в планере: addIssueToSprint сам снимает задачу с текущего спринта доски.
    await addIssueToTrackerSprint({
      organizationId: input.organizationId,
      sprintId: request.moveToSprintId,
      taskId: request.taskId,
    });
    return { detail: `tracker sync: moved ${request.taskId} to sprint ${request.moveToSprintId}` };
  } catch (error) {
    return trackerSyncFailed(request.taskId, error);
  }
}

/** Синк в трекер после коммита: детали и предупреждения дописываются к результату операции. */
export async function runPlanPatchTrackerSyncs(input: {
  applied: SprintPlanPatchApplyOpResult[];
  organizationId: string;
  sprintId: number;
  trackerSyncs: readonly PlanPatchTrackerSyncRequest[];
}): Promise<void> {
  for (const request of input.trackerSyncs) {
    const row = input.applied.find((item) => item.index === request.index);
    if (!row?.ok) continue;
    const sync = await runOneTrackerSync({
      organizationId: input.organizationId,
      request,
      sprintId: input.sprintId,
    });
    row.detail = [row.detail, sync.detail, sync.warning].filter(Boolean).join('; ');
  }
}

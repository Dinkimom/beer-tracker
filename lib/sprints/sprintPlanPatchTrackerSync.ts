import type { SprintPlanPatchOp } from '@/lib/sprints/sprintPlanPatchTypes';

import { getIssueTrackerProviderClientForOrganization } from '@/lib/issueTrackerProvider/clientFactory';
import { resolvePlannerAssigneeIdForTrackerSync } from '@/lib/staffTeams/resolvePlannerAssigneeForTrackerSync';

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

/** After BT position write: optionally add to tracker sprint and assign. Errors are returned, not thrown. */
export async function syncUpsertPositionToTracker(input: {
  assigneeId: string;
  organizationId: string;
  sprintId: number;
  taskId: string;
}): Promise<{ detail?: string; warning?: string }> {
  try {
    const issueTracker = await getIssueTrackerProviderClientForOrganization(
      input.organizationId
    );
    await issueTracker.addIssueToSprint(input.taskId, input.sprintId);
    const trackerAssigneeId = await resolvePlannerAssigneeIdForTrackerSync(
      input.organizationId,
      input.assigneeId
    );
    if (!trackerAssigneeId) {
      return {
        detail: `tracker sync: added ${input.taskId} to sprint ${input.sprintId}`,
        warning: `tracker_assignee_unresolved: ${input.assigneeId}`,
      };
    }
    await issueTracker.updateIssue(input.taskId, { assigneeId: trackerAssigneeId });
    return {
      detail: `tracker sync: added ${input.taskId} to sprint ${input.sprintId}, assigned ${trackerAssigneeId}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      warning: `tracker_sync_failed: ${input.taskId}: ${message}`,
    };
  }
}

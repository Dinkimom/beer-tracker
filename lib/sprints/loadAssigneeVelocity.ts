/**
 * Задачи последних спринтов для велосити: живой список трекера, иначе снимок.
 */

import type { IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';
import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import type { TrackerIntegrationStored } from '@/lib/trackerIntegration';
import type { Task } from '@/types';

import { queryIssueSnapshotsMatchingSprint } from '@/lib/snapshots/issueSnapshotSprintRead';
import { mapTrackerIssueToTask } from '@/lib/trackerApi/issues';

import { averageAssigneeVelocity, deliveryFromTasks, type AssigneeVelocityResponse } from './assigneeVelocity';

type AssigneeVelocityIssueSource = Pick<
  IssueTrackerProviderClient,
  'getSprint' | 'listSprintIssues' | 'mapIssueToTask'
>;

/** Имя, которое не совпадёт с пустым display в снимке, если трекер не отдал спринт. */
const SNAPSHOT_NAME_FALLBACK = '\u0000';

async function tasksFromTracker(
  issueTracker: AssigneeVelocityIssueSource,
  sprintId: number,
  integration: TrackerIntegrationStored | null
): Promise<{ name: string; tasks: Task[] } | null> {
  try {
    const info = await issueTracker.getSprint(sprintId);
    const issues = await issueTracker.listSprintIssues(sprintId, {
      sprintStatus: info.status,
    });
    return {
      name: info.name?.trim() || SNAPSHOT_NAME_FALLBACK,
      tasks: issues.map((issue) => issueTracker.mapIssueToTask(issue, integration)),
    };
  } catch (error) {
    console.warn(`[assignee-velocity] sprint ${sprintId} tracker read failed`, error);
    return null;
  }
}

async function tasksFromSnapshots(
  organizationId: string,
  sprintId: number,
  sprintName: string,
  integration: TrackerIntegrationStored | null
): Promise<Task[] | null> {
  try {
    const issues = await queryIssueSnapshotsMatchingSprint(organizationId, {
      sprintId: String(sprintId),
      sprintName,
    });
    return issues.map((issue) => mapTrackerIssueToTask(issue, integration));
  } catch (error) {
    console.warn(`[assignee-velocity] sprint ${sprintId} snapshot read failed`, error);
    return null;
  }
}

async function tasksForSprint(
  issueTracker: AssigneeVelocityIssueSource,
  organizationId: string,
  sprintId: number,
  integration: TrackerIntegrationStored | null
): Promise<Task[] | null> {
  const fromTracker = await tasksFromTracker(issueTracker, sprintId, integration);
  if (fromTracker && fromTracker.tasks.length > 0) {
    return fromTracker.tasks;
  }
  const snapshots = await tasksFromSnapshots(
    organizationId,
    sprintId,
    fromTracker?.name ?? SNAPSHOT_NAME_FALLBACK,
    integration
  );
  if (snapshots && snapshots.length > 0) return snapshots;
  // Пустой ответ трекера — спринт без задач. Ошибка трекера и пустой снимок — спринт неизвестен.
  if (fromTracker) return [];
  return null;
}

export async function loadAssigneeVelocity(input: {
  completionRules?: SprintTaskCompletionRules | null;
  integration: TrackerIntegrationStored | null;
  issueTracker: AssigneeVelocityIssueSource;
  organizationId: string;
  sprintIds: number[];
}): Promise<AssigneeVelocityResponse> {
  const loaded = await Promise.all(
    input.sprintIds.map((sprintId) =>
      tasksForSprint(input.issueTracker, input.organizationId, sprintId, input.integration)
    )
  );
  const deliveries = loaded
    .filter((tasks): tasks is Task[] => tasks != null)
    .map((tasks) => deliveryFromTasks(tasks, input.completionRules));
  return averageAssigneeVelocity(deliveries);
}

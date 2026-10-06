/**
 * Средний велосити исполнителя: закрытые SP/TP по последним завершённым спринтам доски.
 * Окно не включает открытый спринт — его прогресс уже показан в ячейке как сделано/всего.
 */

import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import type { Task } from '@/types';

import {
  getTaskStoryPoints,
  getTaskTestPoints,
  shouldCountTaskForParticipantVolume,
} from '@/lib/pointsUtils';
import { isSpCompleted, isTpCompleted } from '@/lib/sprints/sprintTaskCompletion';

export const ASSIGNEE_VELOCITY_SPRINT_WINDOW = 3;

const FINISHED_SPRINT_STATUSES = new Set(['archived', 'closed', 'released']);

export interface VelocitySprintCandidate {
  archived?: boolean;
  endDate?: string;
  id: number;
  status?: string;
}

interface AssigneeSprintBucket {
  completedSp: number;
  completedTp: number;
  hadSp: boolean;
  hadTp: boolean;
  name: string | null;
}

export interface AssigneeVelocityPoint {
  /** null — в окне не было SP-задач на этого человека. 0 — задачи были, ничего не закрыто. */
  averageSp: number | null;
  averageTp: number | null;
  /** Сколько спринтов окна вошло в среднее: без задач этого вида спринт пропускается. */
  spSprintCount: number;
  tpSprintCount: number;
}

export interface AssigneeVelocityResponse {
  byAssignee: Record<string, AssigneeVelocityPoint>;
  /** Запасной ключ, если строка планера — `staff:` без tracker id. */
  byName: Record<string, AssigneeVelocityPoint>;
  sprintCount: number;
}

export function assigneeVelocityNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isFinishedSprintStatus(sprint: {
  archived?: boolean;
  status?: string;
}): boolean {
  if (sprint.archived) return true;
  return FINISHED_SPRINT_STATUSES.has((sprint.status ?? '').trim().toLowerCase());
}

function sprintEndKey(value: string | undefined): string {
  return (value ?? '').slice(0, 10);
}

function compareSprintRecency(a: VelocitySprintCandidate, b: VelocitySprintCandidate): number {
  const byEnd = sprintEndKey(b.endDate).localeCompare(sprintEndKey(a.endDate));
  if (byEnd !== 0) return byEnd;
  return b.id - a.id;
}

/** До `limit` завершённых спринтов, которые закончились раньше текущего. */
export function selectRecentFinishedSprints<T extends VelocitySprintCandidate>(
  sprints: readonly T[],
  currentSprintId: number | null,
  limit = ASSIGNEE_VELOCITY_SPRINT_WINDOW
): T[] {
  const current = currentSprintId == null ? undefined : sprints.find((sprint) => sprint.id === currentSprintId);
  const currentEnd = sprintEndKey(current?.endDate);
  const candidates = sprints.filter((sprint) => {
    if (!isFinishedSprintStatus(sprint)) return false;
    if (currentSprintId != null && sprint.id === currentSprintId) return false;
    const end = sprintEndKey(sprint.endDate);
    return !(currentEnd && end >= currentEnd);
  });
  return candidates.sort(compareSprintRecency).slice(0, limit);
}

function bucketFor(
  buckets: Map<string, AssigneeSprintBucket>,
  assigneeId: string
): AssigneeSprintBucket {
  const existing = buckets.get(assigneeId);
  if (existing) return existing;
  const created: AssigneeSprintBucket = {
    completedSp: 0,
    completedTp: 0,
    hadSp: false,
    hadTp: false,
    name: null,
  };
  buckets.set(assigneeId, created);
  return created;
}

function addOriginalTaskDelivery(
  buckets: Map<string, AssigneeSprintBucket>,
  task: Task,
  rules?: SprintTaskCompletionRules | null
): void {
  const assigneeId = task.assignee?.trim();
  if (assigneeId) {
    const bucket = bucketFor(buckets, assigneeId);
    bucket.hadSp = true;
    rememberAssigneeName(bucket, task.assigneeName);
    if (isSpCompleted(task, rules)) {
      bucket.completedSp += getTaskStoryPoints(task);
    }
  }

  const qaId = task.qaEngineer?.trim();
  const testPoints = getTaskTestPoints(task);
  if (!qaId || testPoints <= 0) return;
  const qa = bucketFor(buckets, qaId);
  qa.hadTp = true;
  rememberAssigneeName(qa, task.qaEngineerName);
  if (isTpCompleted(task, rules)) {
    qa.completedTp += testPoints;
  }
}

function qaOwnerIds(task: Task): string[] {
  const ids = [task.assignee, task.qaEngineer]
    .map((id) => id?.trim() ?? '')
    .filter(Boolean);
  return [...new Set(ids)];
}

function addQaTaskDelivery(
  buckets: Map<string, AssigneeSprintBucket>,
  task: Task,
  rules?: SprintTaskCompletionRules | null
): void {
  const testPoints = getTaskTestPoints(task);
  if (testPoints <= 0) return;
  const done = isTpCompleted(task, rules);
  for (const assigneeId of qaOwnerIds(task)) {
    const bucket = bucketFor(buckets, assigneeId);
    bucket.hadTp = true;
    rememberAssigneeName(
      bucket,
      assigneeId === task.assignee?.trim() ? task.assigneeName : task.qaEngineerName
    );
    if (done) {
      bucket.completedTp += testPoints;
    }
  }
}

/** Закрытые очки одного спринта. SP — исполнитель, TP — QA (как метрики сайдбара). */
export function deliveryFromTasks(
  tasks: readonly Task[],
  rules?: SprintTaskCompletionRules | null
): Map<string, AssigneeSprintBucket> {
  const buckets = new Map<string, AssigneeSprintBucket>();
  for (const task of tasks) {
    if (!shouldCountTaskForParticipantVolume(task)) continue;
    if (task.team === 'QA') {
      addQaTaskDelivery(buckets, task, rules);
    } else {
      addOriginalTaskDelivery(buckets, task, rules);
    }
  }
  return buckets;
}

function bucketContribution(
  bucket: AssigneeSprintBucket | undefined,
  kind: 'sp' | 'tp'
): { had: boolean; points: number } {
  if (!bucket) return { had: false, points: 0 };
  if (kind === 'sp') return { had: bucket.hadSp, points: bucket.completedSp };
  return { had: bucket.hadTp, points: bucket.completedTp };
}

function averagePoints(
  deliveries: ReadonlyArray<ReadonlyMap<string, AssigneeSprintBucket>>,
  assigneeId: string,
  kind: 'sp' | 'tp'
): { average: number | null; sprintCount: number } {
  let sprintCount = 0;
  let sum = 0;
  for (const delivery of deliveries) {
    const contribution = bucketContribution(delivery.get(assigneeId), kind);
    if (!contribution.had) continue;
    sprintCount += 1;
    sum += contribution.points;
  }
  if (sprintCount === 0) return { average: null, sprintCount: 0 };
  return { average: sum / sprintCount, sprintCount };
}

function rememberAssigneeName(bucket: AssigneeSprintBucket, name: string | undefined): void {
  const trimmed = name?.trim();
  if (!trimmed || bucket.name) return;
  bucket.name = trimmed;
}

function collectAssigneeIds(
  deliveries: ReadonlyArray<ReadonlyMap<string, AssigneeSprintBucket>>
): string[] {
  const ids = new Set<string>();
  for (const delivery of deliveries) {
    for (const [assigneeId, bucket] of delivery) {
      if (bucket.hadSp || bucket.hadTp) ids.add(assigneeId);
    }
  }
  return [...ids];
}

function displayNameForAssignee(
  deliveries: ReadonlyArray<ReadonlyMap<string, AssigneeSprintBucket>>,
  assigneeId: string
): string | null {
  for (const delivery of deliveries) {
    const name = delivery.get(assigneeId)?.name;
    if (name) return name;
  }
  return null;
}

function claimNameOwner(
  ownerByName: Map<string, string | null>,
  name: string,
  assigneeId: string
): void {
  const key = assigneeVelocityNameKey(name);
  if (!key) return;
  const owner = ownerByName.get(key);
  if (owner === undefined) ownerByName.set(key, assigneeId);
  else if (owner !== assigneeId) ownerByName.set(key, null);
}

function velocityByName(
  deliveries: ReadonlyArray<ReadonlyMap<string, AssigneeSprintBucket>>,
  byAssignee: Record<string, AssigneeVelocityPoint>
): Record<string, AssigneeVelocityPoint> {
  const ownerByName = new Map<string, string | null>();
  for (const assigneeId of Object.keys(byAssignee)) {
    const name = displayNameForAssignee(deliveries, assigneeId);
    if (name) claimNameOwner(ownerByName, name, assigneeId);
  }
  const byName: Record<string, AssigneeVelocityPoint> = {};
  for (const [key, assigneeId] of ownerByName) {
    if (!assigneeId) continue;
    const point = byAssignee[assigneeId];
    if (point) byName[key] = point;
  }
  return byName;
}

/**
 * Среднее только по спринтам, где у человека были задачи этого вида.
 * Спринт без задач не входит в знаменатель. Ноль остаётся, если задачи были и ничего не закрыто.
 */
export function averageAssigneeVelocity(
  deliveries: ReadonlyArray<ReadonlyMap<string, AssigneeSprintBucket>>
): AssigneeVelocityResponse {
  const byAssignee: Record<string, AssigneeVelocityPoint> = {};
  if (deliveries.length === 0) {
    return { byAssignee, byName: {}, sprintCount: 0 };
  }
  for (const assigneeId of collectAssigneeIds(deliveries)) {
    const sp = averagePoints(deliveries, assigneeId, 'sp');
    const tp = averagePoints(deliveries, assigneeId, 'tp');
    byAssignee[assigneeId] = {
      averageSp: sp.average,
      averageTp: tp.average,
      spSprintCount: sp.sprintCount,
      tpSprintCount: tp.sprintCount,
    };
  }
  return {
    byAssignee,
    byName: velocityByName(deliveries, byAssignee),
    sprintCount: deliveries.length,
  };
}

import type { PlannerIntegrationRulesDto } from '@/lib/trackerIntegration/toPlannerDto';
import type { Task } from '@/types';
import type { TaskStatus } from '@/utils/statusMapper';

import { isTaskStatus } from '@/lib/trackerIntegration/schema';
import { mapTrackerStatusTypeKeyToCategory } from '@/lib/trackerIntegration/statusTypeDefaults';
import { mapStatus } from '@/utils/statusMapper';

/**
 * Правила завершения SP/TP:
 * - «завершающий» = категория done (тип статуса в воркфлоу / overrides в настройках);
 * - доп. набор ключей из настроек (`releaseReadiness.readyStatusKey`) — TP готово, SP ещё нет
 *   (раньше хардкод rc|closed).
 */
export interface SprintTaskCompletionRules {
  /** overridesByStatusKey.category из настроек интеграции. */
  statusCategoryByKey: Record<string, TaskStatus>;
  /** defaultsByTrackerStatusType из настроек. */
  statusCategoryByType: Record<string, TaskStatus>;
  /** Ключи статусов «готово к релизу» / TP early-done (из readyStatusKey и т.п.). */
  tpReadyStatusKeys: string[];
}

type TaskCompletionFields = Pick<
  Task,
  'originalStatus' | 'originalStatusId' | 'status' | 'statusTypeKey'
>;

const LEGACY_TP_READY_KEYS = ['rc'] as const;

function normalizeStatusKey(key: string): string {
  return key.trim().toLowerCase();
}

function lookupCategoryByKey(
  statusKey: string,
  byKey: Record<string, TaskStatus>
): TaskStatus | undefined {
  const direct = byKey[statusKey];
  if (direct) return direct;
  const normalized = normalizeStatusKey(statusKey);
  for (const [key, category] of Object.entries(byKey)) {
    if (normalizeStatusKey(key) === normalized) return category;
  }
  return undefined;
}

function categoryFromRules(
  statusKey: string,
  statusId: string | undefined,
  typeKey: string | undefined,
  rules: SprintTaskCompletionRules
): TaskStatus | undefined {
  if (statusId) {
    const fromId = lookupCategoryByKey(statusId, rules.statusCategoryByKey);
    if (fromId) return fromId;
  }
  if (statusKey) {
    const fromOverride = lookupCategoryByKey(statusKey, rules.statusCategoryByKey);
    if (fromOverride) return fromOverride;
  }
  if (!typeKey) return undefined;
  return (
    rules.statusCategoryByType[typeKey] ??
    lookupCategoryByKey(typeKey, rules.statusCategoryByType)
  );
}

function categoryFromHeuristics(
  statusKey: string,
  typeKey: string | undefined
): TaskStatus | undefined {
  // Имя статуса — только точный mapStatus (без подстрок). Тип — statusType / category.
  if (statusKey) {
    const fromMap = mapStatus(statusKey);
    if (fromMap) return fromMap;
  }
  return typeKey ? mapTrackerStatusTypeKeyToCategory(typeKey) : undefined;
}

/** Собирает правила из DTO планера / ответа score API. */
export function sprintTaskCompletionRulesFromPlanner(
  rules: Pick<
    PlannerIntegrationRulesDto,
    'releaseReadiness' | 'statusDefaultsByTrackerStatusType' | 'statusOverridesByStatusKey'
  > | null | undefined
): SprintTaskCompletionRules {
  const ready = rules?.releaseReadiness?.readyStatusKey?.trim();
  const tpReadyStatusKeys = ready ? [ready] : [...LEGACY_TP_READY_KEYS];

  const statusCategoryByKey: Record<string, TaskStatus> = {};
  for (const [key, entry] of Object.entries(rules?.statusOverridesByStatusKey ?? {})) {
    if (entry.category && isTaskStatus(entry.category)) {
      statusCategoryByKey[key] = entry.category;
    }
  }

  const statusCategoryByType: Record<string, TaskStatus> = {};
  for (const [key, category] of Object.entries(rules?.statusDefaultsByTrackerStatusType ?? {})) {
    if (isTaskStatus(category)) {
      statusCategoryByType[key] = category;
    }
  }

  return { statusCategoryByKey, statusCategoryByType, tpReadyStatusKeys };
}

export function sprintTaskCompletionRulesFromIntegration(input: {
  readyStatusKey?: string | null;
  statuses?: {
    defaultsByTrackerStatusType?: Record<string, TaskStatus | string>;
    overridesByStatusKey?: Record<string, { category?: TaskStatus | string; visualToken?: string }>;
  } | null;
}): SprintTaskCompletionRules {
  return sprintTaskCompletionRulesFromPlanner({
    releaseReadiness: {
      readyStatusKey: input.readyStatusKey?.trim() || null,
    },
    statusDefaultsByTrackerStatusType: {
      ...(input.statuses?.defaultsByTrackerStatusType ?? {}),
    },
    statusOverridesByStatusKey: Object.fromEntries(
      Object.entries(input.statuses?.overridesByStatusKey ?? {}).map(([k, v]) => [
        k,
        {
          ...(v.category !== undefined ? { category: String(v.category) } : {}),
          ...(v.visualToken !== undefined ? { visualToken: v.visualToken } : {}),
        },
      ])
    ),
  });
}

/**
 * Категория статуса задачи: task.status → override по ключу → default по типу →
 * mapStatus(ключ) → эвристика по типу.
 */
export function resolveTaskCompletionCategory(
  task: TaskCompletionFields,
  rules?: SprintTaskCompletionRules | null
): TaskStatus {
  if (task.status) return task.status;

  const statusKey = (task.originalStatus ?? '').trim();
  const statusId = task.originalStatusId?.trim();
  const typeKey = task.statusTypeKey?.trim();
  if (rules) {
    const fromRules = categoryFromRules(statusKey, statusId, typeKey, rules);
    if (fromRules) return fromRules;
  }
  return categoryFromHeuristics(statusKey, typeKey) ?? 'todo';
}

function isTpReadyOnlyStatus(
  task: Pick<Task, 'originalStatus' | 'originalStatusId'>,
  rules?: SprintTaskCompletionRules | null
): boolean {
  const candidates = [task.originalStatusId, task.originalStatus]
    .map((k) => normalizeStatusKey(k ?? ''))
    .filter(Boolean);
  if (candidates.length === 0) return false;
  const readyKeys = (rules?.tpReadyStatusKeys?.length ? rules.tpReadyStatusKeys : LEGACY_TP_READY_KEYS).map(
    normalizeStatusKey
  );
  return candidates.some((key) => readyKeys.includes(key));
}

/** SP сделано: завершающая категория, но не «только TP / ready» статус из настроек. */
export function isSpCompleted(
  task: TaskCompletionFields,
  rules?: SprintTaskCompletionRules | null
): boolean {
  if (isTpReadyOnlyStatus(task, rules)) return false;
  return resolveTaskCompletionCategory(task, rules) === 'done';
}

/**
 * TP сделано: завершающая категория ИЛИ ключ из набора настроек (readyStatusKey;
 * без настроек — legacy `rc`).
 */
export function isTpCompleted(
  task: TaskCompletionFields,
  rules?: SprintTaskCompletionRules | null
): boolean {
  if (isTpReadyOnlyStatus(task, rules)) return true;
  return resolveTaskCompletionCategory(task, rules) === 'done';
}

/** Категория для optimistic update по ключу статуса и правилам планера. */
export function resolveStatusCategoryForStatusKey(
  statusKey: string,
  rules?: SprintTaskCompletionRules | null,
  statusTypeKey?: string
): TaskStatus | undefined {
  return resolveTaskCompletionCategory(
    {
      originalStatus: statusKey,
      statusTypeKey,
      status: undefined,
    },
    rules
  );
}

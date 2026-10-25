import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';
import type { Task } from '@/types';

import { isJiraProviderKind } from '@/lib/issueTrackerProvider/types';

/**
 * «Сделано» определяет трекер, а не организация:
 * - Yandex Tracker — статус с типом `done` и заполненная резолюция;
 * - Jira — статус из категории завершения (тип `done`).
 * SP и TP закрываются одним правилом.
 */
export interface SprintTaskCompletionRules {
  /** Tracker требует резолюцию, Jira — нет. */
  requireResolution: boolean;
  /** Справочник статусов трекера: ключ или id статуса → ключ типа статуса. */
  statusTypeByKey: Record<string, string>;
}

type TaskCompletionFields = Pick<
  Task,
  'originalStatus' | 'originalStatusId' | 'resolution' | 'statusTypeKey'
>;

const DONE_STATUS_TYPE = 'done';

const EMPTY_RULES: SprintTaskCompletionRules = { requireResolution: false, statusTypeByKey: {} };

function normalizeKey(key: string | null | undefined): string {
  return (key ?? '').trim().toLowerCase();
}

function statusTypeFromCatalog(
  statusKeys: Array<string | null | undefined>,
  rules: SprintTaskCompletionRules
): string | undefined {
  for (const key of statusKeys) {
    const normalized = normalizeKey(key);
    if (normalized && rules.statusTypeByKey[normalized]) {
      return rules.statusTypeByKey[normalized];
    }
  }
  return undefined;
}

/** Справочник статусов трекера → правила «сделано». */
export function sprintTaskCompletionRulesFromStatuses(
  providerKind: IssueTrackerProviderKind,
  statuses: ReadonlyArray<{ id?: string; key: string; statusType?: { key?: string } }>
): SprintTaskCompletionRules {
  const statusTypeByKey: Record<string, string> = {};
  for (const status of statuses) {
    const typeKey = normalizeKey(status.statusType?.key);
    if (!typeKey) continue;
    for (const key of [status.key, status.id]) {
      const normalized = normalizeKey(key);
      if (normalized) statusTypeByKey[normalized] = typeKey;
    }
  }
  return { requireResolution: !isJiraProviderKind(providerKind), statusTypeByKey };
}

/** Тип статуса задачи: из задачи, иначе из справочника по ключу/id. */
function resolveTaskStatusType(
  task: TaskCompletionFields,
  rules: SprintTaskCompletionRules
): string | undefined {
  const own = normalizeKey(task.statusTypeKey);
  if (own) return own;
  return statusTypeFromCatalog([task.originalStatusId, task.originalStatus], rules);
}

/** Задача сделана по правилу трекера (тип `done`, для Tracker — ещё и резолюция). */
export function isTaskCompleted(
  task: TaskCompletionFields,
  rules?: SprintTaskCompletionRules | null
): boolean {
  const effective = rules ?? EMPTY_RULES;
  if (resolveTaskStatusType(task, effective) !== DONE_STATUS_TYPE) return false;
  return !effective.requireResolution || Boolean(task.resolution?.trim());
}

/**
 * Статус «сделано» по одному ключу (переход в changelog, статус на момент времени).
 * Тип берётся из справочника; резолюция в истории не проверяется — в Tracker переход
 * в статус типа `done` выставляет её вместе со статусом.
 */
export function isStatusKeyCompleted(
  statusKey: string | null | undefined,
  rules?: SprintTaskCompletionRules | null
): boolean {
  return statusTypeFromCatalog([statusKey], rules ?? EMPTY_RULES) === DONE_STATUS_TYPE;
}

/** Ключ типа статуса из справочника — для optimistic-обновления задачи после перехода. */
export function statusTypeKeyForStatus(
  statusKey: string,
  rules?: SprintTaskCompletionRules | null
): string | undefined {
  return statusTypeFromCatalog([statusKey], rules ?? EMPTY_RULES);
}

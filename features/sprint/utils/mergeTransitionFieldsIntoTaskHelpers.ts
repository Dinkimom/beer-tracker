import type { Task } from '@/types';

/**
 * Поля экрана перехода Tracker → ключи Task (дублирует логику TransitionFieldsModal).
 */
export const TRANSITION_FIELD_ID_TO_TASK_KEY: Record<string, string> = {
  bizErpTeam: 'productTeam',
  sprint: 'sprints',
};

const MERGEABLE_TASK_KEYS = new Set([
  'storyPoints',
  'testPoints',
  'assignee',
  'qaEngineer',
  'productTeam',
  'functionalTeam',
  'stage',
  'sprints',
]);

function mergeSprintFieldIntoPatch(raw: unknown): Partial<Task> {
  if (raw == null) return {};
  const arr = raw as unknown;
  if (!Array.isArray(arr) || arr.length === 0) return {};
  const first = arr[0];
  if (first && typeof first === 'object' && first !== null && 'id' in first) {
    const id = String((first as { id: string }).id);
    return { sprints: [{ id, display: id }] };
  }
  return {};
}

function mergePointsIntoPatch(taskKey: string, raw: unknown): Partial<Task> {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (Number.isNaN(n)) return {};
  if (taskKey === 'storyPoints') return { storyPoints: n };
  return { testPoints: n };
}

function mergeStringPersonField(taskKey: string, raw: string): Partial<Task> {
  return taskKey === 'assignee' ? { assignee: raw } : { qaEngineer: raw };
}

function mergePersonIntoPatch(taskKey: string, raw: unknown): Partial<Task> {
  if (typeof raw === 'string' && raw.trim()) {
    return mergeStringPersonField(taskKey, raw);
  }
  if (Array.isArray(raw) && raw[0] != null) {
    return mergeStringPersonField(taskKey, String(raw[0]));
  }
  return {};
}

function mergeProductTeamField(raw: unknown): Partial<Task> {
  if (!Array.isArray(raw)) return {};
  return {
    productTeam: raw.map((x) => (typeof x === 'string' ? x : String(x))),
  };
}

function mergeStringTaskField(taskKey: string, raw: unknown): Partial<Task> {
  if (typeof raw !== 'string') return {};
  if (taskKey === 'functionalTeam') return { functionalTeam: raw };
  if (taskKey === 'stage') return { stage: raw };
  return {};
}

function mergeKnownTransitionTaskKey(taskKey: string, raw: unknown): Partial<Task> {
  if (taskKey === 'productTeam') return mergeProductTeamField(raw);
  if (taskKey === 'storyPoints' || taskKey === 'testPoints') return mergePointsIntoPatch(taskKey, raw);
  if (taskKey === 'assignee' || taskKey === 'qaEngineer') return mergePersonIntoPatch(taskKey, raw);
  return mergeStringTaskField(taskKey, raw);
}

export function mergeOneTransitionField(fieldId: string, raw: unknown): Partial<Task> {
  if (fieldId === 'resolution' || fieldId === 'comment') return {};
  if (fieldId === 'sprint') return mergeSprintFieldIntoPatch(raw);

  const taskKey = TRANSITION_FIELD_ID_TO_TASK_KEY[fieldId] ?? fieldId;
  if (!MERGEABLE_TASK_KEYS.has(taskKey)) return {};
  return mergeKnownTransitionTaskKey(taskKey, raw);
}

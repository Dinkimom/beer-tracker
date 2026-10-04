import type { Task, TaskParent } from '@/types';

import { isFeatureLaneDraftRowId } from '@/lib/sprints/featureLanesDocument';

interface BacklogTaskParentLabel {
  key: string | null;
  title: string;
}

export const BACKLOG_TASK_PARENT_SEPARATOR = ' › ';

function trimmed(value: string | undefined): string {
  return value?.trim() ?? '';
}

function isDraftParent(parent: TaskParent): boolean {
  const key = trimmed(parent.key);
  const id = trimmed(parent.id);
  return (
    (key.length > 0 && isFeatureLaneDraftRowId(key)) || (id.length > 0 && isFeatureLaneDraftRowId(id))
  );
}

function parentIdentity(parent: TaskParent): string {
  const key = trimmed(parent.key);
  if (key) return `key:${key.toLowerCase()}`;
  const id = trimmed(parent.id);
  if (id) return `id:${id.toLowerCase()}`;
  const display = trimmed(parent.display);
  if (display) return `display:${display.toLowerCase()}`;
  return '';
}

function stripKeyPrefix(display: string, key: string): string {
  if (!display.startsWith(key)) return display;
  return display.slice(key.length).replace(/^[·.\s:–—-]+/, '').trim();
}

function toParentLabel(parent: TaskParent): BacklogTaskParentLabel | null {
  const key = trimmed(parent.key) || null;
  const display = trimmed(parent.display);
  if (!key && !display) return null;
  if (!key) return { key: null, title: display };
  const title = stripKeyPrefix(display, key);
  if (!title || title === key) return { key, title: '' };
  return { key, title };
}

/** Эпик, затем непосредственный родитель. Одинаковый ключ показывается один раз. */
export function resolveBacklogTaskParents(
  task: Pick<Task, 'epic' | 'parent'>
): BacklogTaskParentLabel[] {
  const seen = new Set<string>();
  const labels: BacklogTaskParentLabel[] = [];
  for (const parent of [task.epic, task.parent]) {
    if (!parent || isDraftParent(parent)) continue;
    const identity = parentIdentity(parent);
    if (!identity || seen.has(identity)) continue;
    seen.add(identity);
    const label = toParentLabel(parent);
    if (label) labels.push(label);
  }
  return labels;
}

export function formatBacklogTaskParentChain(parents: readonly BacklogTaskParentLabel[]): string {
  return parents
    .map((parent) => (parent.key && parent.title ? `${parent.key} ${parent.title}` : parent.key || parent.title))
    .filter((part) => part.length > 0)
    .join(BACKLOG_TASK_PARENT_SEPARATOR);
}

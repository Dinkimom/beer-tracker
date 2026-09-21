import type { TaskParent } from '@/types';

function trimmedParentField(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Родитель заметки/схемы/картинки из JSONB или тела API. */
export function parseCommentParent(value: unknown): TaskParent | undefined {
  if (value == null || typeof value !== 'object') {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const id = trimmedParentField(record.id);
  const key = trimmedParentField(record.key);
  const display = trimmedParentField(record.display);
  if (!id || !key || !display) {
    return undefined;
  }
  const self = trimmedParentField(record.self);
  return self ? { display, id, key, self } : { display, id, key };
}

export function commentParentToJsonb(parent: TaskParent | null): string | null {
  if (!parent) {
    return null;
  }
  return JSON.stringify({
    display: parent.display,
    id: parent.id,
    key: parent.key,
    ...(parent.self ? { self: parent.self } : {}),
  });
}

export function readCommentParentUpdate(
  body: unknown
): { parent: TaskParent | null; provided: true } | { provided: false } {
  if (body == null || typeof body !== 'object' || !('parent' in body)) {
    return { provided: false };
  }
  const raw = (body as { parent: unknown }).parent;
  if (raw == null) {
    return { provided: true, parent: null };
  }
  const parent = parseCommentParent(raw);
  if (!parent) {
    return { provided: false };
  }
  return { provided: true, parent };
}

import type { StatusRef } from '@/lib/sprints/sprintTaskCompletion';

function extractStatusKeyFromObject(value: object): string | undefined {
  if (!('key' in value)) {
    return undefined;
  }
  const k = (value as { key?: unknown }).key;
  return typeof k === 'string' ? k : undefined;
}

/** Ключ статуса из поля changelog: строка или объект `{ key }`. */
export function extractStatusKey(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return extractStatusKeyFromObject(value);
  }
  return undefined;
}

/** Id статуса из поля changelog `{ id }`: не зависит от языка названий статусов. */
export function extractStatusId(value: unknown): string | undefined {
  if (value == null || typeof value !== 'object' || !('id' in value)) return undefined;
  const id = (value as { id?: unknown }).id;
  return typeof id === 'string' ? id : undefined;
}

/** Статус из поля changelog для поиска в справочнике: id и ключ. */
export function extractStatusRef(value: unknown): StatusRef {
  return { id: extractStatusId(value), key: extractStatusKey(value) };
}

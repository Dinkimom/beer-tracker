import type { Task, TaskCustomFieldUser } from '@/types';

const MAX_DISPLAY_LENGTH = 200;
/** Ссылка на пользователя: `/users/<id>` в Яндексе, `/user?…` в Jira Server. */
const USER_SELF_PATTERN = /\/users?(?:[/?]|$)/;

/** Строка для карточки из значения поля трекера. Пустые и нечитаемые значения пропускаются. */
export function customFieldDisplayValue(value: unknown): string | null {
  const text = displayValue(value);
  if (!text) {
    return null;
  }
  return text.length > MAX_DISPLAY_LENGTH ? text.slice(0, MAX_DISPLAY_LENGTH) : text;
}

export function customFieldDisplayMap(
  fields: Record<string, unknown> | undefined
): Record<string, string> | undefined {
  if (!fields) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    const display = customFieldDisplayValue(value);
    if (display) {
      out[key] = display;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Поля трекера для задачи: текст каждого поля и пользователи тех полей, где они есть. */
export function customFieldTaskFields(
  fields: Record<string, unknown> | undefined
): Pick<Task, 'customFieldUsers' | 'customFieldValues'> {
  const customFieldValues = customFieldDisplayMap(fields);
  if (!customFieldValues || !fields) {
    return {};
  }
  const customFieldUsers: Record<string, TaskCustomFieldUser[]> = {};
  for (const key of Object.keys(customFieldValues)) {
    const users = customFieldUsersOf(fields[key]);
    if (users.length > 0) {
      customFieldUsers[key] = users;
    }
  }
  return Object.keys(customFieldUsers).length > 0 ? { customFieldUsers, customFieldValues } : { customFieldValues };
}

/** Пользователи из значения поля: один пользователь или список. Иначе пусто. */
function customFieldUsersOf(value: unknown): TaskCustomFieldUser[] {
  const items = Array.isArray(value) ? value : [value];
  const users: TaskCustomFieldUser[] = [];
  for (const item of items) {
    const user = readUser(item);
    if (!user) {
      return [];
    }
    users.push(user);
  }
  return users;
}

function readUser(value: unknown): TaskCustomFieldUser | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const looksLikeUser =
    typeof record.accountId === 'string' ||
    (typeof record.self === 'string' && USER_SELF_PATTERN.test(record.self));
  if (!looksLikeUser) {
    return null;
  }
  const id = firstText(record, ['accountId', 'id', 'name', 'key']);
  if (!id) {
    return null;
  }
  return { id, name: displayRecord(record) ?? id };
}

function firstText(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function displayValue(value: unknown): string | null {
  const scalar = scalarDisplay(value);
  if (scalar !== undefined) {
    return scalar;
  }
  if (Array.isArray(value)) {
    return joinDisplayValues(value);
  }
  if (typeof value === 'object' && value !== null) {
    return displayRecord(value as Record<string, unknown>);
  }
  return null;
}

function scalarDisplay(value: unknown): string | null | undefined {
  if (typeof value === 'string') {
    return value.trim() || null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return undefined;
}

function joinDisplayValues(values: unknown[]): string | null {
  const parts = values.map((item) => displayValue(item)).filter((item): item is string => item != null);
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Подпись объекта: `display` (Яндекс), `displayName` (пользователь Jira),
 * `name`, `value` (опция списка Jira), `key`.
 * `displayName` раньше `name`: у пользователя Jira Server `name` — логин.
 */
const RECORD_LABEL_KEYS = ['display', 'displayName', 'name', 'value', 'key'] as const;

function displayRecord(value: Record<string, unknown>): string | null {
  for (const key of RECORD_LABEL_KEYS) {
    const label = value[key];
    if (typeof label === 'string' && label.trim()) {
      return label.trim();
    }
  }
  return null;
}

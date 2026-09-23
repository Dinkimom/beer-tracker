/**
 * Shared Jira status key helpers (issues, transitions, board columns).
 */

interface JiraStatusCategoryRaw {
  key?: string;
  name?: string;
}

interface JiraStatusRaw {
  id?: unknown;
  key?: string;
  name?: string;
  statusCategory?: JiraStatusCategoryRaw;
}

export function jiraNameKey(name: string): string {
  return name.toLowerCase().replaceAll(/\s+/g, '');
}

/** Category → app/mapStatus keys (`new` / `inProgress` / `done`). */
export function mapJiraStatusCategory(
  category: JiraStatusCategoryRaw | null | undefined
): { display: string; key: string } | undefined {
  const rawKey = category?.key?.trim().toLowerCase();
  if (!rawKey) {
    return undefined;
  }
  if (rawKey === 'done') {
    return { display: category?.name?.trim() || 'Done', key: 'done' };
  }
  if (rawKey === 'indeterminate') {
    return { display: category?.name?.trim() || 'In Progress', key: 'inProgress' };
  }
  return { display: category?.name?.trim() || 'To Do', key: 'new' };
}

/**
 * Status identity for kanban / transitions: prefer status name (normalized),
 * then id, then category fallback.
 * `statusTypeKey` — категория Jira (new / inProgress / done) для палитры, когда
 * имя статуса не лежит в STATUS_COLOR_MAP (кириллица, кастомные ключи).
 */
export function mapJiraStatus(status: JiraStatusRaw | null | undefined): {
  display: string;
  id?: string;
  key: string;
  statusTypeKey?: string;
} {
  const display = status?.name?.trim() || status?.key?.trim() || 'unknown';
  const fromCategory = mapJiraStatusCategory(status?.statusCategory);
  const statusTypeKey = fromCategory?.key;
  const withType = statusTypeKey ? { statusTypeKey } : {};
  const idRaw = status?.id != null ? String(status.id).trim() : '';
  const withId = idRaw ? { id: idRaw } : {};

  if (status?.name?.trim()) {
    return { display, key: jiraNameKey(status.name), ...withId, ...withType };
  }
  if (idRaw) {
    return { display, key: idRaw, ...withId, ...withType };
  }
  if (fromCategory) {
    return { display: fromCategory.display, key: fromCategory.key, ...withType };
  }
  return { display, key: 'unknown' };
}

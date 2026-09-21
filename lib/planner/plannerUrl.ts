/** Query-параметр deep-link к карточке на свимлейне (`task.id` или `comment:{uuid}`). */
const PLANNER_FOCUS_TASK_QUERY_KEY = 'focusTask';

/**
 * Канонический путь к планировщику спринта (доска + спринт в URL для прямых ссылок).
 * Query-параметры (page, tab, фильтры) добавляются отдельно.
 */
export function buildPlannerPath(boardId: number, sprintId: number): string {
  return `/planner/${boardId}/sprint/${sprintId}`;
}

export function appendPlannerFocusTaskQuery(path: string, focusTaskId: string): string {
  const trimmed = focusTaskId.trim();
  if (!trimmed) {
    return path;
  }
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}${PLANNER_FOCUS_TASK_QUERY_KEY}=${encodeURIComponent(trimmed)}`;
}

export function readPlannerFocusTaskFromSearchParams(
  searchParams: Pick<URLSearchParams, 'get'>
): string | null {
  const raw = searchParams.get(PLANNER_FOCUS_TASK_QUERY_KEY)?.trim();
  return raw || null;
}

export function stripPlannerFocusTaskFromHref(pathname: string, searchParams: URLSearchParams): string {
  const next = new URLSearchParams(searchParams);
  next.delete(PLANNER_FOCUS_TASK_QUERY_KEY);
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

const PLANNER_PATH_RE = /^\/planner\/(\d+)\/sprint\/(\d+)(?:\/|$)/;

export function parsePlannerPath(pathname: string): { boardId: number; sprintId: number } | null {
  const m = pathname.match(PLANNER_PATH_RE);
  if (!m) return null;
  return { boardId: parseInt(m[1], 10), sprintId: parseInt(m[2], 10) };
}

export function isPlannerPath(pathname: string): boolean {
  return PLANNER_PATH_RE.test(pathname);
}

import { isPlannerPath } from '@/lib/planner/plannerUrl';

const DOCUMENT_TITLE_SEPARATOR = ' · ';

/** Маршруты, где вкладка должна оставаться заголовком спринта, а не статическим «Спринты». */
export function isPlannerDocumentTitleRoute(pathname: string): boolean {
  return pathname === '/' || isPlannerPath(pathname);
}

/**
 * Вкладка планера. Короткое имя спринта («32») не остаётся единственным текстом:
 * рядом подпись команды, если она есть.
 */
export function formatPlannerDocumentTitle(params: {
  boardLabel?: string | null;
  sprintName: string;
}): string {
  const sprint = params.sprintName.trim();
  const board = params.boardLabel?.trim() ?? '';
  if (!board || board === sprint) {
    return sprint;
  }
  return `${sprint}${DOCUMENT_TITLE_SEPARATOR}${board}`;
}

/** Заголовок вкладки планера: на бэклоге — подпись вкладки, иначе спринт и команда. */
export function resolvePlannerDocumentTitle(params: {
  backlogTitle: string;
  boardLabel?: string | null;
  sprintName?: string | null;
  tab?: string | null;
}): string {
  if (params.tab === 'backlog') {
    return params.backlogTitle.trim();
  }
  const sprintName = params.sprintName?.trim() ?? '';
  if (!sprintName) {
    return '';
  }
  return formatPlannerDocumentTitle({
    boardLabel: params.boardLabel,
    sprintName,
  });
}

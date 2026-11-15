/**
 * Версия раскладки спринта для агента: меняется, когда на доске появляется, уходит или сдвигается
 * карточка. Агент читает её в `get_sprint_context` (`meta.boardVersion`) и возвращает в
 * `propose_plan_patch` (`ifBoardVersion`): так сервер замечает, что доску правили после чтения.
 */

import type { SprintContextPosition } from '@/lib/sprints/sprintContextTypes';

import { createHash } from 'crypto';

type VersionedPosition = Pick<
  SprintContextPosition,
  'assigneeId' | 'duration' | 'isQa' | 'segments' | 'startDay' | 'startPart' | 'taskId'
>;

export function sprintBoardVersion(positions: readonly VersionedPosition[]): string {
  const rows = positions
    .map((position) => [
      position.taskId,
      position.assigneeId,
      position.startDay,
      position.startPart,
      position.duration,
      position.isQa,
      (position.segments ?? []).map((segment) => [segment.startDay, segment.startPart, segment.duration]),
    ])
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return createHash('sha256').update(JSON.stringify(rows)).digest('hex').slice(0, 12);
}

/** Предупреждения propose_plan_patch о свежести доски; пусто — агент читал текущую раскладку. */
export function boardVersionWarnings(readVersion: string | undefined, currentVersion: string): string[] {
  if (!readVersion) {
    return [
      'board_version_not_checked: pass ifBoardVersion = meta.boardVersion from your latest get_sprint_context, so the server can tell you when someone changed the board after you read it.',
    ];
  }
  if (readVersion === currentVersion) {
    return [];
  }
  return [
    `board_changed_since_read: the board is not the one you read (boardVersion ${readVersion} → ${currentVersion}): someone added, moved or removed cards. This draft was checked against the current board, but your ops were built from the old one. Re-read get_sprint_context, compare scheduleBefore, and re-propose if the plan no longer fits.`,
  ];
}

import type { Task } from '@/types';

import { isSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { isPlannerNonTrackerCard } from '@/lib/planner/plannerCardKind';


/**
 * В сайдбар («снять с плана») можно бросить только работу из трекера, включая QA-фазу.
 * Заметки, фото, схемы, виджеты и локальные черновики — нет: у них нет позиции задачи.
 */
export function canDropTaskOnSidebar(
  task: Pick<Task, 'id' | 'isLocalTask' | 'localDraftKind'>
): boolean {
  return !isPlannerNonTrackerCard(task) && !isSwimlaneCommentTaskId(task.id);
}

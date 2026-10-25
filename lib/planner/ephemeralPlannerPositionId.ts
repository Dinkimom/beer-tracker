import { isPlannerClientOnlyCardId } from '@/lib/planner/plannerCardKind';

/**
 * Позиции, которые живут только в клиентском стейте планера
 * (черновики quick-add, локальные картинки и аннотации `comment:*` — их место хранится
 * в самой строке `comments`). Их нельзя писать в task_positions.
 */
export function isEphemeralPlannerPositionId(taskId: string): boolean {
  return isPlannerClientOnlyCardId(taskId);
}

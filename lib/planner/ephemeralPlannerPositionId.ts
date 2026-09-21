/**
 * Позиции, которые живут только в клиентском стейте планера
 * (черновики quick-add и локальные картинки). Их нельзя писать в task_positions.
 */
export function isEphemeralPlannerPositionId(taskId: string): boolean {
  return (
    taskId.startsWith('local-task-') ||
    taskId.startsWith('local-image:') ||
    taskId.startsWith('comment:')
  );
}

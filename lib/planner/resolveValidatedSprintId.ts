interface SprintLike {
  archived?: boolean;
  id: number;
  status?: string;
}

/**
 * Оставляет текущий id, если он есть в списке; иначе id из URL, если он валиден;
 * иначе выбирает активный или первый спринт.
 * При пустом списке возвращает текущее значение (список ещё не готов или доска без спринтов).
 */
export function resolveValidatedSprintId(
  currentSprintId: number | null,
  sprints: SprintLike[],
  urlSprintId?: number | null
): number | null {
  if (sprints.length === 0) {
    return currentSprintId;
  }

  if (currentSprintId != null) {
    const sprintExists = sprints.some((s) => s.id === currentSprintId);
    if (sprintExists) {
      return currentSprintId;
    }
  }

  if (urlSprintId != null && sprints.some((s) => s.id === urlSprintId)) {
    return urlSprintId;
  }

  const activeSprint = sprints.find((s) => s.status === 'in_progress' && !s.archived);
  return activeSprint?.id ?? sprints[0].id;
}

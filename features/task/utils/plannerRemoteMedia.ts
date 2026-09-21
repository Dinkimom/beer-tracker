/** Локальные превью (quick-add) не ходят в сеть и не должны ждать оверлей. */
export function isLocalPlannerMediaUrl(url: string): boolean {
  return url.startsWith('blob:') || url.startsWith('data:');
}

/**
 * Пока полноэкранный лоадер держит доску, не стартуем `/api/sprints/.../image` и схемы:
 * иначе карточки с фото конкурируют с задачами/позициями и лоадер висит дольше.
 */
export function resolveDeferredPlannerMediaUrl(
  url: string | undefined,
  loadRemote: boolean
): string | undefined {
  if (!url) {
    return undefined;
  }
  if (loadRemote || isLocalPlannerMediaUrl(url)) {
    return url;
  }
  return undefined;
}

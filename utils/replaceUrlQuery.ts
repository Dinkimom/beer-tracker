/**
 * Правка query текущего адреса без навигации. Берёт адрес на момент вызова и применяет сразу
 * через `history.replaceState` — Next App Router синхронизирует с ним `useSearchParams`.
 *
 * Не собирать query из `useSearchParams()` в замыкании: `router.replace` применяет адрес не сразу,
 * и две записи подряд (вкладка сайдбара, затем `focusTask`) затирали друг друга — вторая писала
 * поверх устаревшего query.
 */
export function replaceUrlQuery(update: (params: URLSearchParams) => void): void {
  const { hash, pathname, search } = window.location;
  const params = new URLSearchParams(search);
  update(params);
  const query = params.toString();
  const nextSearch = query ? `?${query}` : '';
  if (nextSearch === search) {
    return;
  }
  window.history.replaceState(null, '', `${pathname}${nextSearch}${hash}`);
}

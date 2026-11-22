/**
 * `gcTime` запросов TanStack Query: в браузере — заданный срок, на сервере — `Infinity`.
 *
 * На сервере каждый SSR-рендер создаёт свой QueryClient. Конечный `gcTime` заводит у каждого запроса
 * `setTimeout`, а таймер держит async-контекст рендера — весь отрендеренный запрос живёт до срабатывания.
 * С `gcTime` на сутки это утечка: сервер рос на ~1 МБ за загрузку страницы. `Infinity` — серверный
 * умолчательный `gcTime` самого TanStack Query: таймер не заводится, клиент уходит вместе с запросом.
 */
export function clientGcTime(ms: number): number {
  return typeof window === 'undefined' ? Number.POSITIVE_INFINITY : ms;
}

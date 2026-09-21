/** Собирает href для App Router: только `?query` без pathname ведёт на `/`. */
export function hrefWithSearchParams(pathname: string, params: URLSearchParams): string {
  const q = params.toString();
  return q ? `${pathname}?${q}` : pathname;
}

import type { AxiosInstance } from 'axios';

function shouldStopTrackerPagination<T extends { id?: number | string }>(
  page: T[],
  pageSize: number,
  last: T | undefined
): boolean {
  return page.length < pageSize || last?.id == null;
}

async function fetchTrackerPage<T>(
  api: AxiosInstance,
  buildPath: (cursor: string | undefined) => string,
  cursor: string | undefined
): Promise<T[]> {
  const { data } = await api.get<unknown>(buildPath(cursor));
  return Array.isArray(data) ? (data as T[]) : [];
}

export async function fetchPaginatedTrackerPages<T extends { id?: number | string }>(
  api: AxiosInstance,
  buildPath: (cursor: string | undefined) => string,
  pageSize: number
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;

  for (;;) {
    const page = await fetchTrackerPage<T>(api, buildPath, cursor);
    if (page.length === 0) {
      break;
    }
    all.push(...page);
    const last = page[page.length - 1];
    if (shouldStopTrackerPagination(page, pageSize, last)) {
      break;
    }
    cursor = String(last.id);
  }

  return all;
}

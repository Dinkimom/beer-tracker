/** @vitest-environment jsdom */

import type { BacklogResponse, Task } from '@/types';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { removeSprintTaskFromQueries } from '@/features/task/hooks/useTasks';
import { fetchBacklog } from '@/lib/beerTrackerApi';

import { backlogQueryKey, useBacklog } from './useBacklog';

vi.mock('@/lib/beerTrackerApi', () => ({ fetchBacklog: vi.fn() }));
vi.mock('@/features/board/demoPlannerBoardsQueryScope', () => ({ useDemoPlannerBoardsQueryScope: () => false }));

function page(n: number, totalPages: number): BacklogResponse {
  return {
    developers: [{ id: `dev-${n}`, name: `Dev ${n}` } as BacklogResponse['developers'][number]],
    pagination: { page: n, perPage: 2, totalCount: totalPages * 2, totalPages },
    tasks: [`T-${n}a`, `T-${n}b`].map((id) => ({ id, link: '', name: id, team: 'Web' }) as Task),
  };
}

function wrapper(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
}

describe('useBacklog', () => {
  it('догружает все страницы: видны все задачи и настоящее число, а не первые 50', async () => {
    vi.mocked(fetchBacklog).mockImplementation((_board, n = 1) => Promise.resolve(page(n, 3)));
    const client = new QueryClient();
    const { result } = renderHook(() => useBacklog(7), { wrapper: wrapper(client) });
    await waitFor(() => expect(result.current.tasks).toHaveLength(6));
    expect(result.current.developers.map((developer) => developer.id)).toEqual(['dev-1', 'dev-2', 'dev-3']);
    expect(fetchBacklog).toHaveBeenCalledTimes(3);
  });

  it('задача ушла из спринта — бэклог помечен устаревшим и перечитывается', async () => {
    vi.mocked(fetchBacklog).mockResolvedValue(page(1, 1));
    const client = new QueryClient();
    const { result } = renderHook(() => useBacklog(7), { wrapper: wrapper(client) });
    await waitFor(() => expect(result.current.tasks).toHaveLength(2));
    vi.mocked(fetchBacklog).mockClear();
    removeSprintTaskFromQueries(client, 5, 'T-9');
    await waitFor(() => expect(fetchBacklog).toHaveBeenCalled());
    expect(client.getQueryState(backlogQueryKey(7, false))?.isInvalidated).toBe(false);
  });
});

'use client';

import type { BacklogResponse, Developer, Task } from '@/types';
import type { QueryClient } from '@tanstack/react-query';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useDemoPlannerBoardsQueryScope } from '@/features/board/demoPlannerBoardsQueryScope';
import { fetchBacklog } from '@/lib/beerTrackerApi';

const BACKLOG_PER_PAGE = 100;

/** Бэклог доски целиком: все задачи и все разработчики со всех страниц. */
interface BacklogData {
  developers: Developer[];
  tasks: Task[];
}

/** Ключ бэклога доски в React Query: все страницы — один запрос. */
export function backlogQueryKey(
  boardId: number | null,
  forDemoPlannerBoards: boolean
): readonly ['backlog', 'demo', number | null] | readonly ['backlog', number | null] {
  return forDemoPlannerBoards ? (['backlog', 'demo', boardId] as const) : (['backlog', boardId] as const);
}

/**
 * Задача ушла из спринта или пришла в него — бэклог перечитывается. Перечитываются и запросы
 * вкладки, которой нет на экране: при `refetchOnMount: false` иначе она показала бы старый список.
 */
export function invalidateBacklogQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: ['backlog'], refetchType: 'all' }).catch(() => undefined);
}

/** Правка списка бэклога в кэше (оптимистичный перенос и его откат). */
export function patchBacklogTasks(
  queryClient: QueryClient,
  key: ReturnType<typeof backlogQueryKey>,
  patch: (tasks: Task[]) => Task[]
): void {
  queryClient.setQueryData<BacklogData>(key, (old) => (old ? { ...old, tasks: patch(old.tasks) } : old));
}

function mergeDevelopers(pages: BacklogResponse[]): Developer[] {
  const byId = new Map<string, Developer>();
  for (const page of pages) {
    for (const developer of page.developers) {
      if (!byId.has(developer.id)) byId.set(developer.id, developer);
    }
  }
  return [...byId.values()];
}

/** Все страницы по очереди: фильтры по имени и статусу работают на клиенте и должны видеть все задачи. */
async function fetchWholeBacklog(boardId: number): Promise<BacklogData> {
  const first = await fetchBacklog(boardId, 1, BACKLOG_PER_PAGE);
  const pages = [first];
  for (let page = 2; page <= first.pagination.totalPages; page += 1) {
    pages.push(await fetchBacklog(boardId, page, BACKLOG_PER_PAGE));
  }
  return { developers: mergeDevelopers(pages), tasks: pages.flatMap((page) => page.tasks) };
}

const NO_DEVELOPERS: Developer[] = [];
const NO_TASKS: Task[] = [];

/** Бэклог доски. Источник — снимки задач в Postgres (не трекер), поэтому загрузить все страницы дёшево. */
export function useBacklog(boardId: number | null) {
  const forDemoPlannerBoards = useDemoPlannerBoardsQueryScope();
  const key = useMemo(() => backlogQueryKey(boardId, forDemoPlannerBoards), [boardId, forDemoPlannerBoards]);
  const query = useQuery({
    enabled: !!boardId,
    queryFn: () => {
      if (!boardId) {
        throw new Error('Board ID is required');
      }
      return fetchWholeBacklog(boardId);
    },
    queryKey: key,
    staleTime: 1000 * 60 * 5,
  });
  return {
    developers: query.data?.developers ?? NO_DEVELOPERS,
    isLoading: query.isLoading,
    key,
    tasks: query.data?.tasks ?? NO_TASKS,
  };
}

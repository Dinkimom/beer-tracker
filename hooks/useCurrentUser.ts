'use client';

import { useQuery } from '@tanstack/react-query';

import { useDemoPlannerShell } from '@/contexts/DemoPlannerShellContext';
import { getMyself } from '@/lib/beerTrackerApi';

const MYSELF_QUERY_KEY = ['auth', 'myself'] as const;

/**
 * Хук для получения данных текущего пользователя из Tracker (GET /myself).
 * Используется для аватара и отображения имени в шапке.
 * На демо-планере (`DemoPlannerShellProvider`) запрос не выполняется.
 */
export function useCurrentUser() {
  const { isDemoPlanner } = useDemoPlannerShell();
  return useQuery({
    queryKey: MYSELF_QUERY_KEY,
    queryFn: getMyself,
    enabled: !isDemoPlanner,
    staleTime: 1000 * 60 * 10, // 10 минут — данные пользователя редко меняются
    retry: false, // при 401 не повторяем
  });
}

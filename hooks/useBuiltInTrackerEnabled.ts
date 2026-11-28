import { useQuery } from '@tanstack/react-query';

import { fetchOnPremSetupState } from '@/lib/api/onprem';

/**
 * Включён ли на сервере встроенный трекер otorva (`OTORVA_ENABLED`): выбор трекера на онбординге и в
 * админке предлагает его только тогда. Пока ответа нет — не предлагает.
 */
export function useBuiltInTrackerEnabled(): boolean {
  const { data } = useQuery({
    queryKey: ['onprem', 'setup-state'],
    queryFn: fetchOnPremSetupState,
    staleTime: 5 * 60 * 1000,
  });
  return data?.builtInTrackerEnabled === true;
}

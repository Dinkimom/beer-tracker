import type { CustomSelectOption } from '@/components/CustomSelect';
import type { QueueIssueTypeOption } from '@/lib/planner/queueIssueTypes';

import { fetchQueueByKey, fetchQueueIssueTypes } from '@/lib/api/queues';

interface LoadQuickAddBootstrapDataParams {
  fallbackIssueTypeLabel: string;
  queueKey: string;
  queueKeysToResolve: string[];
  applyLoadedData: (
    queueResults: Array<{ key: string; name: string } | null>,
    types: QueueIssueTypeOption[]
  ) => void;
  isCancelled: () => boolean;
  setIsInitialLoading: (loading: boolean) => void;
  setIssueTypeOptions: (options: CustomSelectOption<string>[]) => void;
}

export async function loadQuickAddBootstrapData({
  applyLoadedData,
  fallbackIssueTypeLabel,
  isCancelled,
  queueKey,
  queueKeysToResolve,
  setIssueTypeOptions,
  setIsInitialLoading,
}: LoadQuickAddBootstrapDataParams): Promise<void> {
  try {
    const [queueResults, types] = await Promise.all([
      Promise.all(queueKeysToResolve.map((key) => fetchQueueByKey(key))),
      fetchQueueIssueTypes(queueKey),
    ]);
    if (isCancelled()) {
      return;
    }
    applyLoadedData(queueResults, types);
  } catch {
    if (!isCancelled()) {
      setIssueTypeOptions([{ label: fallbackIssueTypeLabel, value: 'task' }]);
    }
  } finally {
    if (!isCancelled()) {
      setIsInitialLoading(false);
    }
  }
}

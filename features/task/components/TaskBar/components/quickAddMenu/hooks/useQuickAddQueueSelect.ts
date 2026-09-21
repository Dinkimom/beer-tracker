'use client';

import type { CustomSelectOption } from '@/components/CustomSelect';

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import { formatQuickAddQueueLabel, type QuickAddQueueOption } from '@/features/board/quickAddQueueOptions';
import { useDebouncedCallback } from '@/hooks/usePerformance';
import { searchQueues, setCachedQueueByKey } from '@/lib/api/queues';

interface UseQuickAddQueueSelectParams {
  queueKey: string;
  queueNamesByKey: Map<string, string>;
  queueOptions: QuickAddQueueOption[];
  setQueueNamesByKey: Dispatch<SetStateAction<Map<string, string>>>;
}

export function useQuickAddQueueSelect({
  queueKey,
  queueNamesByKey,
  queueOptions,
  setQueueNamesByKey,
}: UseQuickAddQueueSelectParams) {
  const [remoteSearchQueues, setRemoteSearchQueues] = useState<QuickAddQueueOption[]>([]);
  const [isQueueSearching, setIsQueueSearching] = useState(false);

  const displayQueueOptions = useMemo(() => {
    const byKey = new Map<string, QuickAddQueueOption>();
    for (const q of queueOptions) {
      byKey.set(q.key, { key: q.key, name: queueNamesByKey.get(q.key) ?? q.key });
    }
    for (const q of remoteSearchQueues) {
      byKey.set(q.key, q);
    }
    if (queueKey && !byKey.has(queueKey)) {
      byKey.set(queueKey, { key: queueKey, name: queueNamesByKey.get(queueKey) ?? queueKey });
    }
    return Array.from(byKey.values()).sort((a, b) => a.key.localeCompare(b.key, 'ru'));
  }, [queueKey, queueNamesByKey, queueOptions, remoteSearchQueues]);

  const queueSelectOptions = useMemo(
    (): CustomSelectOption<string>[] =>
      displayQueueOptions.map((q) => ({
        label: formatQuickAddQueueLabel(q.key, q.name),
        value: q.key,
      })),
    [displayQueueOptions]
  );

  const selectedQueueName = queueNamesByKey.get(queueKey) ?? queueKey;

  const performQueueSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setRemoteSearchQueues([]);
        setIsQueueSearching(false);
        return;
      }
      setIsQueueSearching(true);
      try {
        const items = await searchQueues(trimmed);
        setRemoteSearchQueues(items);
        setQueueNamesByKey((prev) => {
          const next = new Map(prev);
          for (const item of items) {
            next.set(item.key, item.name);
            setCachedQueueByKey(item.key, item);
          }
          return next;
        });
      } finally {
        setIsQueueSearching(false);
      }
    },
    [setQueueNamesByKey]
  );

  const debouncedQueueSearch = useDebouncedCallback(performQueueSearch, 300, {
    leading: false,
    trailing: true,
  });

  const handleQueueSearchQueryChange = useCallback(
    (query: string) => {
      debouncedQueueSearch(query);
    },
    [debouncedQueueSearch]
  );

  return {
    handleQueueSearchQueryChange,
    isQueueSearching,
    queueSelectOptions,
    selectedQueueName,
  };
}

'use client';

import type { CustomSelectOption } from '@/components/CustomSelect';
import type { QuickAddQueueOption } from '@/features/board/quickAddQueueOptions';
import type { QueueIssueTypeOption } from '@/lib/planner/queueIssueTypes';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useI18n } from '@/contexts/LanguageContext';
import {
  peekCachedQueueByKey,
  peekCachedQueueIssueTypes,
} from '@/lib/api/queues';

import { loadQuickAddBootstrapData } from './loadQuickAddBootstrapData';

interface UseQuickAddMenuBootstrapParams {
  issueType: string;
  queueKey: string;
  queueOptions: QuickAddQueueOption[];
  onIssueTypeChange: (type: string) => void;
}

export function useQuickAddMenuBootstrap({
  issueType,
  onIssueTypeChange,
  queueKey,
  queueOptions,
}: UseQuickAddMenuBootstrapParams) {
  const { t } = useI18n();
  const [issueTypeOptions, setIssueTypeOptions] = useState<CustomSelectOption<string>[]>([]);
  const [queueNamesByKey, setQueueNamesByKey] = useState<Map<string, string>>(() => new Map());
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const registryQueueKeys = useMemo(
    () => queueOptions.map((q) => q.key).sort().join('\n'),
    [queueOptions]
  );

  const issueTypeRef = useRef(issueType);
  const onIssueTypeChangeRef = useRef(onIssueTypeChange);

  useEffect(() => {
    issueTypeRef.current = issueType;
    onIssueTypeChangeRef.current = onIssueTypeChange;
  });

  const applyLoadedData = useCallback(
    (
      queueResults: Array<{ key: string; name: string } | null>,
      types: QueueIssueTypeOption[]
    ) => {
      setQueueNamesByKey((prev) => {
        const next = new Map(prev);
        for (const item of queueResults) {
          if (item) {
            next.set(item.key, item.name);
          }
        }
        return next;
      });

      const options =
        types.length > 0
          ? types.map((row) => ({ label: row.label, value: row.key }))
          : [{ label: t('sprintPlanner.swimlane.quickAddMenu.issueTypeTask'), value: 'task' }];
      setIssueTypeOptions(options);
      if (!options.some((o) => o.value === issueTypeRef.current)) {
        onIssueTypeChangeRef.current(options[0]?.value ?? 'task');
      }
    },
    [t]
  );

  useEffect(() => {
    if (!queueKey) {
      return;
    }

    let cancelled = false;
    const registryKeys = registryQueueKeys.split('\n').filter(Boolean);
    const queueKeysToResolve = [...new Set([...registryKeys, queueKey])];
    const cachedTypes = peekCachedQueueIssueTypes(queueKey);
    const cachedQueues = queueKeysToResolve.map((key) => peekCachedQueueByKey(key));
    const hasFullCache =
      cachedTypes !== undefined && cachedQueues.every((entry) => entry !== undefined);

    if (hasFullCache) {
      queueMicrotask(() => {
        if (cancelled) return;
        applyLoadedData(cachedQueues, cachedTypes);
        setIsInitialLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (!cancelled) {
        setIsInitialLoading(true);
      }
    });

    loadQuickAddBootstrapData({
      applyLoadedData,
      fallbackIssueTypeLabel: t('sprintPlanner.swimlane.quickAddMenu.issueTypeTask'),
      isCancelled: () => cancelled,
      queueKey,
      queueKeysToResolve,
      setIssueTypeOptions,
      setIsInitialLoading,
    });

    return () => {
      cancelled = true;
    };
  }, [applyLoadedData, queueKey, registryQueueKeys, t]);

  return {
    isInitialLoading: queueKey ? isInitialLoading : false,
    issueTypeOptions: queueKey ? issueTypeOptions : [],
    queueNamesByKey,
    setQueueNamesByKey,
  };
}

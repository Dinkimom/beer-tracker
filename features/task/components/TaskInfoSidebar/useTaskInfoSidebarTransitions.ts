'use client';

import type { Task } from '@/types';

import { useEffect, useState } from 'react';

import { getTaskTrackerDisplayKey } from '@/features/task/utils/taskUtils';
import { getIssueTransitions, type TransitionItem } from '@/lib/beerTrackerApi';

interface UseTaskInfoSidebarTransitionsResult {
  isLoading: boolean;
  transitions: TransitionItem[];
}

/** Загрузка ближайших transitions для сайдера информации о задаче. */
export function useTaskInfoSidebarTransitions(task: Task): UseTaskInfoSidebarTransitionsResult {
  const issueKey = getTaskTrackerDisplayKey(task);
  const [transitions, setTransitions] = useState<TransitionItem[]>([]);
  const [isLoading, setIsLoading] = useState(!task.isLocalTask);

  useEffect(() => {
    if (task.isLocalTask) {
      queueMicrotask(() => {
        setTransitions([]);
        setIsLoading(false);
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setIsLoading(true);
      }
    });

    const loadTransitions = () =>
      getIssueTransitions(issueKey)
        .then((data) => {
          if (cancelled) {
            return;
          }
          setTransitions(Array.isArray(data) ? data : []);
          setIsLoading(false);
        })
        .catch(() => {
          if (cancelled) {
            return;
          }
          setTransitions([]);
          setIsLoading(false);
        });

    loadTransitions();

    return () => {
      cancelled = true;
    };
  }, [issueKey, task.isLocalTask, task.originalStatus, task.status]);

  return { isLoading, transitions };
}

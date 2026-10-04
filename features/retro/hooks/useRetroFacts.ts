'use client';

import type { SprintTaskCompletionRules } from '@/lib/sprints/sprintTaskCompletion';
import type { Task } from '@/types';
import type { ChangelogEntry, SprintListItem } from '@/types/tracker';

import { useQueries } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { fetchIssueChangelogBatch } from '@/lib/api/issues';
import {
  computeRetroFacts,
  isDeclinedStatus,
  selectRetroFactTasks,
  type RetroFacts,
} from '@/lib/retro/retroFacts';
import { isSpCompleted } from '@/lib/sprints/sprintTaskCompletion';

const CHANGELOG_BATCH_LIMIT = 100;

function chunkKeys(keys: string[]): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < keys.length; index += CHANGELOG_BATCH_LIMIT) {
    chunks.push(keys.slice(index, index + CHANGELOG_BATCH_LIMIT));
  }
  return chunks;
}

function sprintIsOpen(sprint: SprintListItem): boolean {
  if (sprint.archived) return false;
  return sprint.status === 'draft' || sprint.status === 'in_progress';
}

function sprintWindow(sprint: SprintListItem): { endMs: number; startMs: number } | null {
  const startMs = Date.parse(sprint.startDateTime || sprint.startDate);
  const endMs = Date.parse(sprint.endDateTime || sprint.endDate);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  return { endMs, startMs };
}

interface UseRetroFactsInput {
  completionRules?: SprintTaskCompletionRules | null;
  sprint: SprintListItem | null;
  tasks: Task[] | undefined;
  tasksPending: boolean;
}

export function useRetroFacts({
  completionRules,
  sprint,
  tasks,
  tasksPending,
}: UseRetroFactsInput): {
  error: boolean;
  facts: RetroFacts | null;
  loading: boolean;
} {
  const population = useMemo(
    () => (tasksPending || !tasks ? [] : selectRetroFactTasks(tasks)),
    [tasks, tasksPending]
  );
  const issueKeys = useMemo(() => population.map((task) => task.id), [population]);
  const chunks = useMemo(() => chunkKeys(issueKeys), [issueKeys]);

  const queries = useQueries({
    queries: chunks.map((keys) => ({
      enabled: keys.length > 0,
      queryFn: () => fetchIssueChangelogBatch(keys),
      queryKey: ['retroFactsChangelog', [...keys].sort().join(',')],
      staleTime: 2 * 60 * 1000,
    })),
  });

  const changelogLoading = queries.some((query) => query.isLoading);
  const changelogError = queries.some((query) => query.isError);
  const changelogsReady = chunks.length === 0 || queries.every((query) => query.data != null);
  const [nowMs] = useState(() => Date.now());

  const facts = useMemo(() => {
    if (!sprint || tasksPending || !changelogsReady) return null;
    const window = sprintWindow(sprint);
    if (!window) return null;
    const byKey = new Map<string, ChangelogEntry[]>();
    for (const query of queries) {
      for (const [key, payload] of Object.entries(query.data ?? {})) {
        byKey.set(key, payload.changelog ?? []);
      }
    }
    return computeRetroFacts({
      issues: population.map((task) => {
        const declined = isDeclinedStatus(task.originalStatus);
        return {
          assignee: task.assignee,
          changelog: byKey.get(task.id) ?? [],
          createdAt: task.createdAt,
          declined,
          done: !declined && isSpCompleted(task, completionRules),
          id: task.id,
          name: task.name,
          storyPoints: task.storyPoints,
        };
      }),
      nowMs,
      sprint: { ...window, open: sprintIsOpen(sprint) },
    });
  }, [changelogsReady, completionRules, nowMs, population, queries, sprint, tasksPending]);

  return {
    error: changelogError && facts == null,
    facts,
    loading: tasksPending || (issueKeys.length > 0 && changelogLoading && facts == null),
  };
}

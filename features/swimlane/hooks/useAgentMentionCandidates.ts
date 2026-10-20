'use client';

import type { AgentMentionCandidate } from '@/lib/agentSessions/agentMentions';

import { useMemo } from 'react';

import { parseSwimlaneCommentTaskId } from '@/features/comments/utils/swimlaneCommentTaskBridge';
import { useTasks } from '@/features/task/hooks/useTasks';
import { getTaskTrackerDisplayKey } from '@/features/task/utils/taskUtils';
import { useSelectedBoardStorage } from '@/hooks/useLocalStorage';

/**
 * Кого и что можно упомянуть через «@» в просьбе агенту: задачи спринта и люди доски.
 * Берём из того же кэша React Query, что и планер — лишних запросов нет.
 */
export function useAgentMentionCandidates(sprintId: number | null | undefined): AgentMentionCandidate[] {
  const [boardId] = useSelectedBoardStorage();
  const tasksQuery = useTasks(sprintId ?? null, boardId);
  const tasks = tasksQuery.data?.tasks;
  const developers = tasksQuery.data?.developers;
  return useMemo(() => {
    const people: AgentMentionCandidate[] = (developers ?? [])
      .filter((developer) => developer.name.trim())
      .map((developer) => ({ id: developer.id, kind: 'person', label: developer.name.trim() }));
    const seen = new Set<string>();
    const taskCandidates: AgentMentionCandidate[] = [];
    for (const task of tasks ?? []) {
      if (parseSwimlaneCommentTaskId(task.id) != null) {
        continue;
      }
      const label = getTaskTrackerDisplayKey(task);
      if (!label || seen.has(label)) {
        continue;
      }
      seen.add(label);
      taskCandidates.push({ hint: task.name, id: task.id, kind: 'task', label });
    }
    return [...people, ...taskCandidates];
  }, [developers, tasks]);
}

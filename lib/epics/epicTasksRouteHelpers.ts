import type { IssueTrackerIssue, IssueTrackerProviderClient } from '@/lib/issueTrackerProvider/types';

import { NextResponse } from 'next/server';

import { apiCache, cacheKeys } from '@/lib/cache';

export function isTaskOrBugIssue(issue: { type?: { key?: string } | null }): boolean {
  const key = issue.type?.key;
  return key === 'task' || key === 'bug';
}

function readEpicTasksCachedWithoutBoard(epicKey: string): NextResponse | null {
  const cacheKey = cacheKeys.epicTasks(epicKey);
  const cachedData = apiCache.get<{ tasks: unknown[] }>(cacheKey);
  if (cachedData) {
    return NextResponse.json(cachedData);
  }
  return null;
}

export function resolveEpicTasksBoardId(
  epicKey: string,
  boardIdParam: string | null
): NextResponse | { boardId: number; cacheKey: string } | { cacheKey: string; missingBoardId: true } {
  const boardId = boardIdParam ? parseInt(boardIdParam, 10) : null;
  if (!boardId) {
    const cachedResponse = readEpicTasksCachedWithoutBoard(epicKey);
    if (cachedResponse) {
      return cachedResponse;
    }
    return { cacheKey: cacheKeys.epicTasks(epicKey), missingBoardId: true };
  }
  return { boardId, cacheKey: cacheKeys.epicTasks(epicKey, boardId) };
}

export async function collectEpicTasksFromStories(
  issueTracker: IssueTrackerProviderClient,
  storyIssues: Array<{ key?: string }>,
  boardId: number
) {
  const tasksFromStories = [];
  for (const story of storyIssues) {
    const storyKey = story.key;
    if (!storyKey) continue;
    try {
      const storyChildren = await issueTracker.getIssueChildren(storyKey, boardId);
      const storyTaskIssues = storyChildren.filter(isTaskOrBugIssue);
      tasksFromStories.push(
        ...storyTaskIssues.map((issue: IssueTrackerIssue) => issueTracker.mapIssueToTask(issue))
      );
    } catch {
      // ignore per-story errors
    }
  }
  return tasksFromStories;
}

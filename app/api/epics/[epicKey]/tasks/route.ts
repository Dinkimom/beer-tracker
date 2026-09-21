import { NextRequest, NextResponse } from 'next/server';

import { apiCache } from '@/lib/cache';
import { getIssueTrackerProviderKind } from '@/lib/env';
import {
  collectEpicTasksFromStories,
  isTaskOrBugIssue,
  resolveEpicTasksBoardId,
} from '@/lib/epics/epicTasksRouteHelpers';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { issueTrackerProviderCapabilities } from '@/lib/issueTrackerProvider/issueTrackerUi';
import { resolveParams } from '@/lib/nextjs-utils';

// Кэшируем задачи эпика на 3 минуты
const EPIC_TASKS_CACHE_TTL = 3 * 60; // 3 минуты в секундах

/**
 * GET /api/epics/[epicKey]/tasks
 * Получить все дочерние задачи эпика (как для стори — через Tracker API).
 * Возвращает: задачи напрямую под эпиком + задачи под стори эпика.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ epicKey: string }> | { epicKey: string } }
) {
  try {
    const { epicKey } = await resolveParams(params);

    if (!epicKey) {
      return NextResponse.json({ error: 'epicKey is required' }, { status: 400 });
    }

    const boardIdParam = request.nextUrl.searchParams.get('boardId');
    const resolved = resolveEpicTasksBoardId(epicKey, boardIdParam);
    if (resolved instanceof NextResponse) {
      return resolved;
    }
    if ('missingBoardId' in resolved) {
      return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
    }

    const { boardId, cacheKey } = resolved;
    const cachedData = apiCache.get<{ tasks: unknown[] }>(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    if (!issueTrackerProviderCapabilities(getIssueTrackerProviderKind()).supportsIssueChildren) {
      const responseData = { tasks: [] };
      apiCache.set(cacheKey, responseData, EPIC_TASKS_CACHE_TTL);
      return NextResponse.json(responseData);
    }
    const issues = await issueTracker.getIssueChildren(epicKey, boardId);

    const directTaskIssues = issues.filter(isTaskOrBugIssue);
    const storyIssues = issues.filter((issue) => issue.type?.key === 'story');

    const tasksFromStories = await collectEpicTasksFromStories(
      issueTracker,
      storyIssues,
      boardId
    );
    const directTasks = directTaskIssues.map((issue) => issueTracker.mapIssueToTask(issue));
    const tasks = [...directTasks, ...tasksFromStories];

    const responseData = { tasks };
    apiCache.set(cacheKey, responseData, EPIC_TASKS_CACHE_TTL);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching epic tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch epic tasks' }, { status: 500 });
  }
}

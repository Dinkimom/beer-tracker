import { NextRequest, NextResponse } from 'next/server';

import { apiCache, cacheKeys } from '@/lib/cache';
import { getIssueTrackerProviderKind } from '@/lib/env';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { issueTrackerProviderCapabilities } from '@/lib/issueTrackerProvider/issueTrackerUi';
import { resolveParams } from '@/lib/nextjs-utils';

// Кэшируем задачи стори на 3 минуты
const STORY_TASKS_CACHE_TTL = 3 * 60; // 3 минуты в секундах

/**
 * GET /api/stories/[storyKey]/tasks
 * Получить все задачи для стори
 * Загружает задачи напрямую из трекера для получения актуальных данных
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyKey: string }> | { storyKey: string } }
) {
  try {
    const { storyKey } = await resolveParams(params);

    if (!storyKey) {
      return NextResponse.json(
        { error: 'storyKey is required' },
        { status: 400 }
      );
    }

    // Получаем boardId из query параметров (если есть)
    const boardIdParam = request.nextUrl.searchParams.get('boardId');
    const boardId = boardIdParam ? parseInt(boardIdParam, 10) : null;

    // Если boardId не передан — in-memory кэш в процессе (без board-контекста)
    if (!boardId) {
      const cacheKey = cacheKeys.storyTasks(storyKey);
      const cachedData = apiCache.get<{ tasks: unknown[] }>(cacheKey);
      if (cachedData) {
        return NextResponse.json(cachedData);
      }

      // Если нет boardId и нет кэша, возвращаем ошибку
      return NextResponse.json(
        { error: 'boardId is required' },
        { status: 400 }
      );
    }

    // Проверяем кэш с учетом boardId
    const cacheKey = cacheKeys.storyTasks(storyKey, boardId);
    const cachedData = apiCache.get<{ tasks: unknown[] }>(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    // Загружаем задачи напрямую из трекера
    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);
    if (!issueTrackerProviderCapabilities(getIssueTrackerProviderKind()).supportsIssueChildren) {
      const responseData = { tasks: [] };
      apiCache.set(cacheKey, responseData, STORY_TASKS_CACHE_TTL);
      return NextResponse.json(responseData);
    }
    const issues = await issueTracker.getIssueChildren(storyKey, boardId);

    // Фильтруем только задачи и баги (type: task OR type: bug)
    const taskIssues = issues.filter(issue => issue.type?.key === 'task' || issue.type?.key === 'bug');
    const tasks = taskIssues.map((issue) => issueTracker.mapIssueToTask(issue));

    console.warn(`[GET /stories/${storyKey}/tasks] Returning ${tasks.length} tasks (from ${issues.length} issues, ${taskIssues.length} tasks/bugs)`);

    const responseData = { tasks };

    // Сохраняем в кэш
    apiCache.set(cacheKey, responseData, STORY_TASKS_CACHE_TTL);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching story tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story tasks' },
      { status: 500 }
    );
  }
}


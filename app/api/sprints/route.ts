import { NextResponse } from 'next/server';
import { z } from 'zod';

import { TRACKER_UPSTREAM_FORWARD_STATUSES, handleApiError } from '@/lib/api-error-handler';
import { apiCache, cacheKeys } from '@/lib/cache';
import { jsonGzipResponse } from '@/lib/http/jsonGzipResponse';
import { getIssueTrackerProviderClientFromRequest } from '@/lib/issueTrackerProvider/clientFactory';
import { buildCreateSprintApiResponse } from '@/lib/sprints/sprintTrackerRouteJson';
import { BoardIdQuerySchema, formatValidationError, validateRequest } from '@/lib/validation';

// Кэшируем список спринтов на 10 минут
const SPRINTS_CACHE_TTL = 10 * 60; // 10 минут в секундах

// Схема валидации для создания спринта
const CreateSprintSchema = z.object({
  name: z.string().min(1, 'Название спринта обязательно'),
  boardId: z.number().int().positive('ID доски должен быть положительным числом'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD'),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    // Валидация через Zod
    const validation = validateRequest(BoardIdQuerySchema, { boardId });
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const { boardId: validatedBoardId } = validation.data;
    const refresh = searchParams.get('refresh') === '1';

    // Проверяем кэш
    const cacheKey = cacheKeys.sprints(Number(validatedBoardId));
    const cachedData = refresh ? null : apiCache.get<unknown>(cacheKey);

    const acceptEncoding = request.headers.get('accept-encoding');

    if (cachedData) {
      return jsonGzipResponse(cachedData, acceptEncoding);
    }

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);

    const data = await issueTracker.listSprints(Number(validatedBoardId));
    const sprints = Array.isArray(data) ? data : [];

    // Сохраняем в кэш
    apiCache.set(cacheKey, sprints, SPRINTS_CACHE_TTL);

    return jsonGzipResponse(sprints, acceptEncoding);
  } catch (error) {
    return handleApiError(error, 'fetch sprints from Tracker', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}

/**
 * Создание нового спринта
 * POST /v3/sprints
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Валидация через Zod
    const validation = validateRequest(CreateSprintSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const { name, boardId, startDate, endDate } = validation.data;

    const issueTracker = await getIssueTrackerProviderClientFromRequest(request);

    const data = await issueTracker.createSprint({
      name,
      boardId,
      startDate,
      endDate,
    });

    // Инвалидируем кэш спринтов для этой доски
    const cacheKey = cacheKeys.sprints(boardId);
    apiCache.delete(cacheKey);

    return NextResponse.json(buildCreateSprintApiResponse(data));
  } catch (error) {
    return handleApiError(error, 'create sprint', {
      forwardStatuses: TRACKER_UPSTREAM_FORWARD_STATUSES,
    });
  }
}

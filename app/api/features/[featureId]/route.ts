import { NextRequest, NextResponse } from 'next/server';

import { apiCache, cacheKeys, invalidateCache } from '@/lib/cache';
import {
  buildFeatureUpdateSql,
  deleteFeatureCascade,
  fetchFeatureById,
  updateFeatureById,
} from '@/lib/features';
import { resolveParams } from '@/lib/nextjs-utils';
import { UpdateFeatureSchema, formatValidationError, validateRequest } from '@/lib/validation';

// Кэшируем фичу на 5 минут
const FEATURE_CACHE_TTL = 5 * 60; // 5 минут в секундах

/**
 * GET /api/features/[featureId]
 * Получить фичу по ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string }> | { featureId: string } }
) {
  try {
    const { featureId } = await resolveParams(params);

    // Проверяем кэш
    const cacheKey = cacheKeys.feature(featureId);
    const cachedData = apiCache.get<{ feature: unknown }>(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const feature = await fetchFeatureById(featureId);

    if (!feature) {
      return NextResponse.json(
        { error: 'Feature not found' },
        { status: 404 }
      );
    }

    const responseData = { feature };

    // Сохраняем в кэш
    apiCache.set(cacheKey, responseData, FEATURE_CACHE_TTL);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching feature:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/features/[featureId]
 * Обновить фичу
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string }> | { featureId: string } }
) {
  try {
    const { featureId } = await resolveParams(params);

    // Если это ключ трекера (например NW-5380), не обновляем через БД
    // Эпики и стори из трекера управляются трекером, а не нашей БД
    const isTrackerKey = /^[A-Z]+-\d+$/.test(featureId);
    if (isTrackerKey) {
      return NextResponse.json(
        { error: 'Tracker keys cannot be updated through this endpoint' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Валидация через Zod
    const validation = validateRequest(UpdateFeatureSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const updates = validation.data;
    const built = buildFeatureUpdateSql(updates);
    if ('error' in built) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    const { updateFields, updateValues } = built;

    const feature = await updateFeatureById(featureId, updateFields, updateValues);

    if (!feature) {
      return NextResponse.json(
        { error: 'Feature not found' },
        { status: 404 }
      );
    }

    // Инвалидируем кэш фичи
    invalidateCache.feature(featureId);

    return NextResponse.json({ feature });
  } catch (error) {
    console.error('Error updating feature:', error);
    return NextResponse.json(
      { error: 'Failed to update feature' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/features/[featureId]
 * Удалить фичу
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string }> | { featureId: string } }
) {
  try {
    const { featureId } = await resolveParams(params);

    const deleted = await deleteFeatureCascade(featureId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Feature not found' },
        { status: 404 }
      );
    }

    // Инвалидируем кэш фичи
    invalidateCache.feature(featureId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting feature:', error);
    return NextResponse.json(
      { error: 'Failed to delete feature' },
      { status: 500 }
    );
  }
}

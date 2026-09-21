import { NextRequest, NextResponse } from 'next/server';

import { apiCache, cacheKeys } from '@/lib/cache';
import { listDocumentTypes } from '@/lib/features';

// Кэшируем справочник типов документов на 30 минут (редко меняется)
const DOCUMENT_TYPES_CACHE_TTL = 30 * 60; // 30 минут в секундах

/**
 * GET /api/document-types
 * Получить все типы документов из справочника
 */
export async function GET(_request: NextRequest) {
  try {
    // Проверяем кэш
    const cacheKey = cacheKeys.documentTypes();
    const cachedData = apiCache.get<{ documentTypes: unknown[] }>(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const documentTypes = await listDocumentTypes();
    const responseData = { documentTypes };

    // Сохраняем в кэш
    apiCache.set(cacheKey, responseData, DOCUMENT_TYPES_CACHE_TTL);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching document types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document types' },
      { status: 500 }
    );
  }
}

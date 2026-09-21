import { NextRequest, NextResponse } from 'next/server';

import { apiCache, cacheKeys, invalidateCache } from '@/lib/cache';
import {
  fetchDocumentTypeByCode,
  fetchDocumentTypeMetaById,
  insertFeatureDocument,
  listFeatureDocuments,
  nextFeatureDocumentDisplayOrder,
  normalizeDocumentContent,
} from '@/lib/features';
import { resolveParams } from '@/lib/nextjs-utils';
import { CreateDocumentSchema, formatValidationError, validateRequest } from '@/lib/validation';

// Кэшируем документы на 3 минуты
const DOCUMENTS_CACHE_TTL = 3 * 60; // 3 минуты в секундах

/**
 * GET /api/features/[featureId]/documents
 * Получить все документы фичи
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string }> | { featureId: string } }
) {
  try {
    const { featureId } = await resolveParams(params);

    // Проверяем кэш
    const cacheKey = cacheKeys.featureDocuments(featureId);
    const cachedData = apiCache.get<{ documents: unknown[] }>(cacheKey);

    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    const documents = await listFeatureDocuments(featureId);
    const responseData = { documents };

    // Сохраняем в кэш
    apiCache.set(cacheKey, responseData, DOCUMENTS_CACHE_TTL);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/features/[featureId]/documents
 * Создать новый документ
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string }> | { featureId: string } }
) {
  try {
    const { featureId } = await resolveParams(params);
    const body = await request.json();

    // Валидация через Zod
    const validation = validateRequest(CreateDocumentSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const { name, content, type } = validation.data;

    const documentType = await fetchDocumentTypeByCode(type);

    if (!documentType) {
      return NextResponse.json(
        { error: `Document type '${type}' not found` },
        { status: 400 }
      );
    }

    const contentResult = normalizeDocumentContent(content, documentType.content_format);
    if ('error' in contentResult) {
      return contentResult.error;
    }

    const displayOrder = await nextFeatureDocumentDisplayOrder(featureId);

    const documentRow = await insertFeatureDocument({
      featureId,
      documentTypeId: documentType.id,
      name,
      content: contentResult.content,
      displayOrder,
    }) as {
      content: string;
      createdAt: string;
      displayOrder: number;
      documentTypeId: string;
      id: string;
      name: string;
      updatedAt: string;
    };

    const docType = await fetchDocumentTypeMetaById(documentType.id);

    const responseData = {
      document: {
        id: documentRow.id,
        name: documentRow.name,
        content: documentRow.content,
        documentTypeId: documentRow.documentTypeId,
        displayOrder: documentRow.displayOrder,
        createdAt: documentRow.createdAt,
        updatedAt: documentRow.updatedAt,
        type: docType?.code || 'markdown',
        iconName: docType?.iconName,
        editorType: docType?.editorType,
      },
    };

    // Инвалидируем кэш документов фичи
    invalidateCache.feature(featureId);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}

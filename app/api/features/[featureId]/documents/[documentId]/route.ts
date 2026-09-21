import { NextRequest, NextResponse } from 'next/server';

import { invalidateCache } from '@/lib/cache';
import {
  deleteFeatureDocumentById,
  fetchDocumentTypeMetaById,
  fetchFeatureDocumentById,
  updateFeatureDocumentById,
} from '@/lib/features';
import { resolveParams } from '@/lib/nextjs-utils';
import { UpdateDocumentSchema, formatValidationError, validateRequest } from '@/lib/validation';

/**
 * GET /api/features/[featureId]/documents/[documentId]
 * Получить документ по ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string; documentId: string }> | { featureId: string; documentId: string } }
) {
  try {
    const { featureId, documentId } = await resolveParams(params);

    const document = await fetchFeatureDocumentById(featureId, documentId);

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/features/[featureId]/documents/[documentId]
 * Обновить документ
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string; documentId: string }> | { featureId: string; documentId: string } }
) {
  try {
    const { featureId, documentId } = await resolveParams(params);
    const body = await request.json();

    // Валидация через Zod
    const validation = validateRequest(UpdateDocumentSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const { name, content } = validation.data;

    if (name === undefined && content === undefined) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const updatedRow = await updateFeatureDocumentById({
      featureId,
      documentId,
      name,
      content,
    });

    if (!updatedRow) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const row = updatedRow as { documentTypeId: string };
    const docType = await fetchDocumentTypeMetaById(row.documentTypeId);

    // Инвалидируем кэш документов фичи
    invalidateCache.feature(featureId);

    return NextResponse.json({
      document: {
        ...updatedRow,
        type: docType?.code || 'markdown',
        iconName: docType?.iconName,
        editorType: docType?.editorType,
      },
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/features/[featureId]/documents/[documentId]
 * Удалить документ
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string; documentId: string }> | { featureId: string; documentId: string } }
) {
  try {
    const { featureId, documentId } = await resolveParams(params);

    const deleted = await deleteFeatureDocumentById(featureId, documentId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Инвалидируем кэш документов фичи
    invalidateCache.feature(featureId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

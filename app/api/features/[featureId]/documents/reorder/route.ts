import { NextRequest, NextResponse } from 'next/server';

import { invalidateCache } from '@/lib/cache';
import { reorderFeatureDocuments } from '@/lib/features';
import { resolveParams } from '@/lib/nextjs-utils';
import { ReorderDocumentsSchema, formatValidationError, validateRequest } from '@/lib/validation';

/**
 * POST /api/features/[featureId]/documents/reorder
 * Изменить порядок документов
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string }> | { featureId: string } }
) {
  try {
    const { featureId } = await resolveParams(params);
    const body = await request.json();

    // Валидация через Zod
    const validation = validateRequest(ReorderDocumentsSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const { documentIds } = validation.data;

    await reorderFeatureDocuments(featureId, documentIds);

    // Инвалидируем кэш документов фичи
    invalidateCache.feature(featureId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering documents:', error);
    return NextResponse.json(
      { error: 'Failed to reorder documents' },
      { status: 500 }
    );
  }
}

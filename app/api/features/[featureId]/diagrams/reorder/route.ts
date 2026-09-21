import { NextRequest, NextResponse } from 'next/server';

import { reorderFeatureDiagrams } from '@/lib/features';
import { resolveParams } from '@/lib/nextjs-utils';
import { ReorderDiagramsSchema, formatValidationError, validateRequest } from '@/lib/validation';

/**
 * POST /api/features/[featureId]/diagrams/reorder
 * Изменить порядок диаграмм
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string }> | { featureId: string } }
) {
  try {
    const { featureId } = await resolveParams(params);
    const body = await request.json();

    // Валидация через Zod
    const validation = validateRequest(ReorderDiagramsSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const { diagramIds } = validation.data;

    await reorderFeatureDiagrams(featureId, diagramIds);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering diagrams:', error);
    return NextResponse.json(
      { error: 'Failed to reorder diagrams' },
      { status: 500 }
    );
  }
}

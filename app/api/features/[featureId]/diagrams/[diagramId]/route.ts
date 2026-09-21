import { NextRequest, NextResponse } from 'next/server';

import {
  deleteFeatureDiagramById,
  fetchFeatureDiagramById,
  updateFeatureDiagramById,
} from '@/lib/features';
import { resolveParams } from '@/lib/nextjs-utils';
import { UpdateDiagramSchema, formatValidationError, validateRequest } from '@/lib/validation';

/**
 * GET /api/features/[featureId]/diagrams/[diagramId]
 * Получить диаграмму по ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string; diagramId: string }> | { featureId: string; diagramId: string } }
) {
  try {
    const { featureId, diagramId } = await resolveParams(params);

    const diagram = await fetchFeatureDiagramById(featureId, diagramId);

    if (!diagram) {
      return NextResponse.json(
        { error: 'Diagram not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ diagram });
  } catch (error) {
    console.error('Error fetching diagram:', error);
    return NextResponse.json(
      { error: 'Failed to fetch diagram' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/features/[featureId]/diagrams/[diagramId]
 * Обновить диаграмму
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string; diagramId: string }> | { featureId: string; diagramId: string } }
) {
  try {
    const { featureId, diagramId } = await resolveParams(params);
    const body = await request.json();

    // Валидация через Zod
    const validation = validateRequest(UpdateDiagramSchema, body);
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

    const diagram = await updateFeatureDiagramById({
      featureId,
      diagramId,
      name,
      content,
    });

    if (!diagram) {
      return NextResponse.json(
        { error: 'Diagram not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ diagram });
  } catch (error) {
    console.error('Error updating diagram:', error);
    return NextResponse.json(
      { error: 'Failed to update diagram' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/features/[featureId]/diagrams/[diagramId]
 * Удалить диаграмму
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string; diagramId: string }> | { featureId: string; diagramId: string } }
) {
  try {
    const { featureId, diagramId } = await resolveParams(params);

    const deleted = await deleteFeatureDiagramById(featureId, diagramId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Diagram not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting diagram:', error);
    return NextResponse.json(
      { error: 'Failed to delete diagram' },
      { status: 500 }
    );
  }
}

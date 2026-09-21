import { NextRequest, NextResponse } from 'next/server';

import {
  insertFeatureDiagram,
  listFeatureDiagrams,
  nextFeatureDiagramDisplayOrder,
} from '@/lib/features';
import { resolveParams } from '@/lib/nextjs-utils';
import { CreateDiagramSchema, formatValidationError, validateRequest } from '@/lib/validation';

/**
 * GET /api/features/[featureId]/diagrams
 * Получить все диаграммы фичи
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string }> | { featureId: string } }
) {
  try {
    const { featureId } = await resolveParams(params);

    const diagrams = await listFeatureDiagrams(featureId);

    return NextResponse.json({ diagrams });
  } catch (error) {
    console.error('Error fetching diagrams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch diagrams' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/features/[featureId]/diagrams
 * Создать новую диаграмму
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string }> | { featureId: string } }
) {
  try {
    const { featureId } = await resolveParams(params);
    const body = await request.json();

    // Валидация через Zod
    const validation = validateRequest(CreateDiagramSchema, body);
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
    const displayOrder = await nextFeatureDiagramDisplayOrder(featureId);

    const diagram = await insertFeatureDiagram({
      featureId,
      name,
      content,
      displayOrder,
    });

    return NextResponse.json({ diagram });
  } catch (error) {
    console.error('Error creating diagram:', error);
    return NextResponse.json(
      { error: 'Failed to create diagram' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { fetchGroomingDiagram, upsertGroomingDiagram } from '@/lib/features';
import { resolveParams } from '@/lib/nextjs-utils';
import { formatValidationError, validateRequest } from '@/lib/validation';

const UpdateDiagramSchema = z.object({
  content: z.string(),
});

/**
 * GET /api/features/[featureId]/grooming/diagram
 * Получить диаграмму груминга
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string }> | { featureId: string } }
) {
  try {
    const { featureId } = await resolveParams(params);

    const diagram = await fetchGroomingDiagram(featureId);

    if (!diagram) {
      // Если диаграммы нет, возвращаем пустую
      return NextResponse.json({ diagram: null });
    }

    return NextResponse.json({ diagram });
  } catch (error) {
    console.error('Error fetching grooming diagram:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grooming diagram' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/features/[featureId]/grooming/diagram
 * Создать или обновить диаграмму груминга
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string }> | { featureId: string } }
) {
  try {
    const { featureId } = await resolveParams(params);
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

    const { content } = validation.data;

    const diagram = await upsertGroomingDiagram(featureId, content);

    return NextResponse.json({ diagram });
  } catch (error) {
    console.error('Error saving grooming diagram:', error);
    return NextResponse.json(
      { error: 'Failed to save grooming diagram' },
      { status: 500 }
    );
  }
}

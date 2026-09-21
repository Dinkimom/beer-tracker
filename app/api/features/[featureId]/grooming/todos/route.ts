import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  insertGroomingTodo,
  listGroomingTodos,
  nextGroomingTodoDisplayOrder,
} from '@/lib/features';
import { resolveParams } from '@/lib/nextjs-utils';
import { formatValidationError, validateRequest } from '@/lib/validation';

const CreateTodoSchema = z.object({
  text: z.string().max(1000).default(''),
});

/**
 * GET /api/features/[featureId]/grooming/todos
 * Получить список задач груминга
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string }> | { featureId: string } }
) {
  try {
    const { featureId } = await resolveParams(params);

    const todos = await listGroomingTodos(featureId);

    return NextResponse.json({ todos });
  } catch (error) {
    console.error('Error fetching grooming todos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grooming todos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/features/[featureId]/grooming/todos
 * Создать новую задачу груминга
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string }> | { featureId: string } }
) {
  try {
    const { featureId } = await resolveParams(params);
    const body = await request.json();

    // Валидация через Zod
    const validation = validateRequest(CreateTodoSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatValidationError(validation.error),
        },
        { status: 400 }
      );
    }

    const { text } = validation.data;
    const displayOrder = await nextGroomingTodoDisplayOrder(featureId);

    const todo = await insertGroomingTodo({
      featureId,
      text,
      displayOrder,
    });

    return NextResponse.json({ todo }, { status: 201 });
  } catch (error) {
    console.error('Error creating grooming todo:', error);
    return NextResponse.json(
      { error: 'Failed to create grooming todo' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  deleteGroomingTodoById,
  fetchGroomingTodoById,
  updateGroomingTodoById,
} from '@/lib/features';
import { resolveParams } from '@/lib/nextjs-utils';
import { formatValidationError, validateRequest } from '@/lib/validation';

const UpdateTodoSchema = z.object({
  assignee: z.string().max(255).nullable().optional(),
  completed: z.boolean().optional(),
  deadline: z.string().nullable().optional(),
  text: z.string().min(1).max(1000).optional(),
});

/**
 * GET /api/features/[featureId]/grooming/todos/[todoId]
 * Получить задачу груминга
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string; todoId: string }> | { featureId: string; todoId: string } }
) {
  try {
    const { featureId, todoId } = await resolveParams(params);

    const todo = await fetchGroomingTodoById(featureId, todoId);

    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ todo });
  } catch (error) {
    console.error('Error fetching grooming todo:', error);
    return NextResponse.json(
      { error: 'Failed to fetch grooming todo' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/features/[featureId]/grooming/todos/[todoId]
 * Обновить задачу груминга
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string; todoId: string }> | { featureId: string; todoId: string } }
) {
  try {
    const { featureId, todoId } = await resolveParams(params);
    const body = await request.json();

    // Валидация через Zod
    const validation = validateRequest(UpdateTodoSchema, body);
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

    if (
      updates.text === undefined &&
      updates.deadline === undefined &&
      updates.assignee === undefined &&
      updates.completed === undefined
    ) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const todo = await updateGroomingTodoById({
      featureId,
      todoId,
      text: updates.text,
      deadline: updates.deadline,
      assignee: updates.assignee,
      completed: updates.completed,
    });

    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ todo });
  } catch (error) {
    console.error('Error updating grooming todo:', error);
    return NextResponse.json(
      { error: 'Failed to update grooming todo' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/features/[featureId]/grooming/todos/[todoId]
 * Удалить задачу груминга
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ featureId: string; todoId: string }> | { featureId: string; todoId: string } }
) {
  try {
    const { featureId, todoId } = await resolveParams(params);

    const deleted = await deleteGroomingTodoById(featureId, todoId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting grooming todo:', error);
    return NextResponse.json(
      { error: 'Failed to delete grooming todo' },
      { status: 500 }
    );
  }
}

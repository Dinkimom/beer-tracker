import { NextRequest, NextResponse } from 'next/server';

import { resolveParams } from '@/lib/nextjs-utils';
import { listStoryTaskPositions, replaceStoryTaskPositions } from '@/lib/stories';

/**
 * GET /api/stories/[storyKey]/task-positions
 * Получить все позиции задач для стори
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyKey: string }> | { storyKey: string } }
) {
  try {
    const { storyKey } = await resolveParams(params);

    const positions = await listStoryTaskPositions(storyKey);

    return NextResponse.json({ positions });
  } catch (error) {
    console.error('[GET /task-positions] Error fetching task positions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task positions' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/stories/[storyKey]/task-positions
 * Обновить позиции задач для стори
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storyKey: string }> | { storyKey: string } }
) {
  try {
    const { storyKey } = await resolveParams(params);
    const body = await request.json();

    if (!Array.isArray(body.positions)) {
      console.error('[PUT /task-positions] Invalid body:', { body });
      return NextResponse.json(
        { error: 'positions must be an array' },
        { status: 400 }
      );
    }

    const insertedCount = await replaceStoryTaskPositions(storyKey, body.positions);

    return NextResponse.json({ success: true, insertedCount });
  } catch (error) {
    console.error('[PUT /task-positions] Error updating task positions:', error);
    return NextResponse.json(
      { error: 'Failed to update task positions', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

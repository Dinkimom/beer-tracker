import { NextRequest, NextResponse } from 'next/server';

import { parseTags } from '@/lib/parseTags';
import {
  deleteStoryDraftTask,
  insertStoryDraftTask,
  listStoryDraftTasks,
  updateStoryDraftTask,
} from '@/lib/stories';

// GET /api/stories/[storyKey]/draft-tasks - получить драфт-задачи для стори
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ storyKey: string }> }
) {
  try {
    const { storyKey } = await params;

    const tasks = await listStoryDraftTasks(storyKey);

    const formattedTasks = tasks.map((task) => ({
      id: task.id,
      name: task.name,
      tags: parseTags(task.tags),
      storyPoints: task.story_points,
      testPoints: task.test_points,
      linkedTaskIds: JSON.parse(task.linked_task_ids || '[]'),
      position: {
        x: task.position_x,
        y: task.position_y,
      },
      isFromTracker: false,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    }));

    return NextResponse.json({ tasks: formattedTasks });
  } catch (error) {
    console.error('Failed to fetch draft tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch draft tasks' },
      { status: 500 }
    );
  }
}

// POST /api/stories/[storyKey]/draft-tasks - создать драфт-задачу
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyKey: string }> }
) {
  try {
    const { storyKey } = await params;
    const body = await request.json();

    const {
      id,
      name = '',
      tags = [],
      storyPoints,
      testPoints,
      linkedTaskIds = [],
      position = { x: 0, y: 0 },
    } = body;

    const taskId = id || crypto.randomUUID();
    const now = new Date().toISOString();

    await insertStoryDraftTask({
      id: taskId,
      storyKey,
      name,
      tags,
      storyPoints,
      testPoints,
      linkedTaskIds,
      position,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      task: {
        id: taskId,
        name,
        tags,
        storyPoints,
        testPoints,
        linkedTaskIds,
        position,
        isFromTracker: false,
        createdAt: now,
        updatedAt: now,
      },
    });
  } catch (error) {
    console.error('Failed to create draft task:', error);
    return NextResponse.json(
      { error: 'Failed to create draft task' },
      { status: 500 }
    );
  }
}

// PUT /api/stories/[storyKey]/draft-tasks - обновить драфт-задачу
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ storyKey: string }> }
) {
  try {
    const { storyKey } = await params;
    const body = await request.json();

    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    await updateStoryDraftTask(storyKey, id, body, now);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update draft task:', error);
    return NextResponse.json(
      { error: 'Failed to update draft task' },
      { status: 500 }
    );
  }
}

// DELETE /api/stories/[storyKey]/draft-tasks - удалить драфт-задачу
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storyKey: string }> }
) {
  try {
    const { storyKey } = await params;
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    await deleteStoryDraftTask(storyKey, taskId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete draft task:', error);
    return NextResponse.json(
      { error: 'Failed to delete draft task' },
      { status: 500 }
    );
  }
}

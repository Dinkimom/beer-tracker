import { NextRequest, NextResponse } from 'next/server';

import { resolveParams } from '@/lib/nextjs-utils';
import {
  deleteStoryTaskLinkByEndpoints,
  deleteStoryTaskLinkById,
  insertStoryTaskLink,
  listStoryTaskLinks,
} from '@/lib/stories';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyKey: string }> | { storyKey: string } }
) {
  try {
    const { storyKey } = await resolveParams(params);

    if (!storyKey) {
      return NextResponse.json(
        { error: 'storyKey is required' },
        { status: 400 }
      );
    }

    const links = await listStoryTaskLinks(storyKey);

    return NextResponse.json({ links });
  } catch (error) {
    console.error('Error fetching story task links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch story task links' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyKey: string }> | { storyKey: string } }
) {
  try {
    const { storyKey } = await resolveParams(params);
    const body = await request.json();

    if (!storyKey) {
      return NextResponse.json(
        { error: 'storyKey is required' },
        { status: 400 }
      );
    }

    const { fromTaskId, toTaskId, id } = body;

    if (!fromTaskId || !toTaskId) {
      return NextResponse.json(
        { error: 'fromTaskId and toTaskId are required' },
        { status: 400 }
      );
    }

    if (fromTaskId === toTaskId) {
      return NextResponse.json(
        { error: 'Cannot link task to itself' },
        { status: 400 }
      );
    }

    const linkId = id || `link-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const link = await insertStoryTaskLink({
      id: linkId,
      storyKey,
      fromTaskId,
      toTaskId,
    });

    if (!link) {
      return NextResponse.json(
        { error: 'Link already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json({ link });
  } catch (error) {
    console.error('Error saving story task link:', error);
    return NextResponse.json(
      { error: 'Failed to save story task link' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storyKey: string }> | { storyKey: string } }
) {
  try {
    const { storyKey } = await resolveParams(params);
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('linkId');
    const fromTaskId = searchParams.get('fromTaskId');
    const toTaskId = searchParams.get('toTaskId');

    if (!storyKey) {
      return NextResponse.json(
        { error: 'storyKey is required' },
        { status: 400 }
      );
    }

    if (linkId) {
      await deleteStoryTaskLinkById(storyKey, linkId);
    } else if (fromTaskId && toTaskId) {
      await deleteStoryTaskLinkByEndpoints(storyKey, fromTaskId, toTaskId);
    } else {
      return NextResponse.json(
        { error: 'linkId or (fromTaskId and toTaskId) is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting story task link:', error);
    return NextResponse.json(
      { error: 'Failed to delete story task link' },
      { status: 500 }
    );
  }
}

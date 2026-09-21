import type { ExcalidrawCommentScene } from '@/lib/comments/excalidrawCommentPayload';
import type { Comment, SprintCommentsResponse, TaskParent } from '@/types';

import { parseStickyNoteReactions, type StickyNoteReaction } from '@/lib/comments/stickyNoteReaction';

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

import { mapCommentFromApi, persistSprintComment } from './sprintsApiCommentsHelpers';

/**
 * Получает комментарии в спринте
 */
export async function fetchSprintComments(sprintId: number): Promise<Comment[]> {
  try {
    const { data }: { data: SprintCommentsResponse } = await getPlannerBeerTrackerApi().get(
      `/sprints/${sprintId}/comments`
    );
    return (data.comments || []).map((comment) => mapCommentFromApi(comment, sprintId));
  } catch (error) {
    console.error(`Failed to fetch comments for sprint ${sprintId}:`, error);
    throw error;
  }
}

/**
 * Сохраняет комментарий в спринте
 */
export async function saveComment(
  sprintId: number,
  comment: {
    assigneeId: string;
    color?: string;
    day?: number | null;
    height: number;
    id?: string;
    imageFileId?: string | null;
    kind?: 'diagram' | 'image' | 'text';
    parent?: TaskParent | null;
    part?: number | null;
    skipMentionNotifications?: boolean;
    text: string;
    width: number;
    x?: number | null;
    y?: number | null;
  },
  isUpdate: boolean = false
): Promise<Comment | boolean> {
  try {
    return await persistSprintComment(sprintId, comment, isUpdate);
  } catch (error) {
    console.error(`Failed to save comment ${comment.id ?? '(new)'}:`, error);
    throw error;
  }
}

/**
 * Удаляет комментарий из спринта
 */
export async function deleteComment(sprintId: number, commentId: string): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().delete(`/sprints/${sprintId}/comments?commentId=${commentId}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete comment ${commentId}:`, error);
    return false;
  }
}

export async function approveSprintComment(sprintId: number, commentId: string): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().post(`/sprints/${sprintId}/comments/${commentId}/approve`);
    return true;
  } catch (error) {
    console.error(`Failed to approve comment ${commentId}:`, error);
    return false;
  }
}

export async function approveAllPendingSprintComments(sprintId: number): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().post(`/sprints/${sprintId}/comments/pending`);
    return true;
  } catch (error) {
    console.error(`Failed to approve pending comments in sprint ${sprintId}:`, error);
    return false;
  }
}

export async function rejectAllPendingSprintComments(sprintId: number): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().delete(`/sprints/${sprintId}/comments/pending`);
    return true;
  } catch (error) {
    console.error(`Failed to reject pending comments in sprint ${sprintId}:`, error);
    return false;
  }
}

export async function createSprintImageComment(
  sprintId: number,
  input: {
    assigneeId: string;
    caption: string;
    day: number;
    file: Blob;
    height: number;
    part: number;
    width: number;
  }
): Promise<Comment | null> {
  try {
    const formData = new FormData();
    formData.append('file', input.file);
    formData.append('assigneeId', input.assigneeId);
    formData.append('caption', input.caption);
    formData.append('day', String(input.day));
    formData.append('part', String(input.part));
    formData.append('width', String(input.width));
    formData.append('height', String(input.height));
    const { data } = await getPlannerBeerTrackerApi().post<{
      comment: SprintCommentsResponse['comments'][number];
    }>(`/sprints/${sprintId}/comments/image`, formData);
    if (!data?.comment) {
      return null;
    }
    return mapCommentFromApi(data.comment, sprintId);
  } catch (error) {
    console.error(`Failed to create image comment for sprint ${sprintId}:`, error);
    return null;
  }
}

export async function createSprintDiagramComment(
  sprintId: number,
  input: {
    assigneeId: string;
    day: number;
    height: number;
    name?: string;
    part: number;
    width: number;
  }
): Promise<Comment | null> {
  try {
    const { data } = await getPlannerBeerTrackerApi().post<{
      comment: SprintCommentsResponse['comments'][number];
    }>(`/sprints/${sprintId}/comments/diagram`, {
      assigneeId: input.assigneeId,
      day: input.day,
      height: input.height,
      name: input.name,
      part: input.part,
      width: input.width,
    });
    if (!data?.comment) {
      return null;
    }
    return mapCommentFromApi(data.comment, sprintId);
  } catch (error) {
    console.error(`Failed to create diagram comment for sprint ${sprintId}:`, error);
    return null;
  }
}

export async function fetchSprintCommentDiagram(
  sprintId: number,
  commentId: string
): Promise<ExcalidrawCommentScene | null> {
  try {
    const { data } = await getPlannerBeerTrackerApi().get<{
      scene: ExcalidrawCommentScene;
    }>(`/sprints/${sprintId}/comments/${commentId}/diagram`, {
      headers: { 'Cache-Control': 'no-cache' },
      params: { t: Date.now() },
    });
    return data?.scene ?? null;
  } catch (error) {
    console.error(`Failed to fetch diagram for comment ${commentId}:`, error);
    return null;
  }
}

export async function moveSprintComments(
  sprintId: number,
  targetSprintId: number,
  commentIds: string[]
): Promise<boolean> {
  if (commentIds.length === 0) {
    return true;
  }
  try {
    await getPlannerBeerTrackerApi().post(`/sprints/${sprintId}/comments/move`, {
      commentIds,
      targetSprintId,
    });
    return true;
  } catch (error) {
    console.error(`Failed to move comments from sprint ${sprintId} to ${targetSprintId}:`, error);
    return false;
  }
}

export async function saveSprintCommentDiagram(
  sprintId: number,
  commentId: string,
  scene: ExcalidrawCommentScene
): Promise<boolean> {
  try {
    await getPlannerBeerTrackerApi().put(
      `/sprints/${sprintId}/comments/${commentId}/diagram`,
      scene
    );
    return true;
  } catch (error) {
    console.error(`Failed to save diagram for comment ${commentId}:`, error);
    return false;
  }
}

export async function toggleCommentReaction(
  sprintId: number,
  commentId: string,
  emoji: string
): Promise<StickyNoteReaction[] | null> {
  try {
    const { data } = await getPlannerBeerTrackerApi().put<{ reactions: StickyNoteReaction[] }>(
      `/sprints/${sprintId}/comments/${commentId}/reactions`,
      { emoji }
    );
    return parseStickyNoteReactions(data.reactions);
  } catch (error) {
    console.error(`Failed to toggle reaction on comment ${commentId}:`, error);
    return null;
  }
}

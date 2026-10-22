import type { Comment, TaskParent } from '@/types';

import { parseCommentAuthorName } from '@/lib/comments/commentAuthor';
import {
  parsePlannerCommentKind,
  plannerCommentDiagramUrl,
  plannerCommentImageUrl,
} from '@/lib/comments/commentKind';
import { parseCommentParent } from '@/lib/comments/commentParent';
import { parseStickyNoteColor } from '@/lib/comments/stickyNoteColor';
import { parseStickyNoteReactions } from '@/lib/comments/stickyNoteReaction';
import { planPatchClientBrandFromUnknown } from '@/lib/sprints/sprintPlanPatchPositionPreview';

import { getPlannerBeerTrackerApi } from '../plannerBeerTrackerApiOverride';

interface SaveCommentInput {
  assigneeId: string;
  color?: string;
  day?: number | null;
  height: number;
  id?: string;
  imageFileId?: string | null;
  kind?: 'diagram' | 'image' | 'text' | 'widget';
  parent?: TaskParent | null;
  part?: number | null;
  skipMentionNotifications?: boolean;
  text: string;
  width: number;
  x?: number | null;
  y?: number | null;
}

/** 0 — валидный день/часть/координата; `|| null` превратил бы их в null и COALESCE на сервере оставил бы старый старт. */
export function commentToSaveApiFields(comment: SaveCommentInput): {
  assigneeId: string;
  color?: string;
  day: number | null;
  height: number;
  id: string;
  imageFileId: string | null;
  kind?: 'diagram' | 'image' | 'text' | 'widget';
  parent: TaskParent | null;
  part: number | null;
  skipMentionNotifications?: boolean;
  text: string;
  width: number;
  x: number | null;
  y: number | null;
} {
  return {
    id: comment.id ?? '',
    assigneeId: comment.assigneeId,
    color: comment.color,
    imageFileId: comment.imageFileId ?? null,
    kind: comment.kind,
    parent: comment.parent ?? null,
    skipMentionNotifications: comment.skipMentionNotifications,
    text: comment.text,
    x: comment.x ?? null,
    y: comment.y ?? null,
    day: comment.day ?? null,
    part: comment.part ?? null,
    width: comment.width,
    height: comment.height,
  };
}

interface CommentFromApi {
  assignee_id: string;
  author_name?: string | null;
  client_brand?: string | null;
  color?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  day: number | null;
  height: number;
  id: string;
  image_file_id?: string | null;
  kind?: string | null;
  parent?: TaskParent | null;
  part: number | null;
  pending_approval?: boolean | null;
  reactions?: unknown;
  replace_action?: string | null;
  replaces_comment_id?: string | null;
  text: string;
  width: number;
  x: number | null;
  y: number | null;
}

function commentMediaUrls(
  kind: ReturnType<typeof parsePlannerCommentKind>,
  commentId: string,
  sprintId: number | undefined
): Pick<Comment, 'diagramUrl' | 'imageUrl'> {
  if (sprintId == null) {
    return {};
  }
  if (kind === 'image') {
    return { imageUrl: plannerCommentImageUrl(sprintId, commentId) };
  }
  if (kind === 'diagram') {
    return { diagramUrl: plannerCommentDiagramUrl(sprintId, commentId) };
  }
  return {};
}

function commentApprovalFields(
  comment: CommentFromApi
): Pick<Comment, 'clientBrand' | 'pendingApproval' | 'replaceAction' | 'replacesCommentId'> {
  const clientBrand = planPatchClientBrandFromUnknown(comment.client_brand);
  const replaces = comment.pending_approval === true ? comment.replaces_comment_id : null;
  const replaceAction = comment.replace_action === 'delete' ? 'delete' : 'update';
  return {
    ...(comment.pending_approval === true ? { pendingApproval: true } : {}),
    ...(clientBrand ? { clientBrand } : {}),
    ...(replaces ? { replaceAction, replacesCommentId: replaces } : {}),
  };
}

export function mapCommentFromApi(comment: CommentFromApi, sprintId?: number): Comment {
  const authorName = parseCommentAuthorName(comment.author_name);
  const createdBy = parseCommentAuthorName(comment.created_by);
  const kind = parsePlannerCommentKind(comment.kind);
  const imageFileId = comment.image_file_id ?? undefined;
  const parent = parseCommentParent(comment.parent);
  return {
    id: comment.id,
    assigneeId: comment.assignee_id,
    ...(authorName ? { authorName } : {}),
    color: parseStickyNoteColor(comment.color),
    imageFileId,
    ...(kind === 'text' ? {} : { kind }),
    ...(parent ? { parent } : {}),
    ...commentMediaUrls(kind, comment.id, sprintId),
    text: comment.text,
    x: comment.x ?? 0,
    y: comment.y ?? 0,
    day: comment.day ?? 0,
    part: comment.part ?? 0,
    width: comment.width,
    height: comment.height,
    createdAt: comment.created_at ?? undefined,
    ...(createdBy ? { createdBy } : {}),
    ...commentApprovalFields(comment),
    ...(comment.reactions === undefined ? {} : { reactions: parseStickyNoteReactions(comment.reactions) }),
  };
}

async function postCommentAndReturn(
  sprintId: number,
  comment: SaveCommentInput
): Promise<Comment | null> {
  const { data } = await getPlannerBeerTrackerApi().post<{ comment: CommentFromApi }>(
    `/sprints/${sprintId}/comments`,
    {
      ...commentToSaveApiFields(comment),
      color: parseStickyNoteColor(comment.color),
    }
  );
  if (!data?.comment) return null;
  return mapCommentFromApi(data.comment, sprintId);
}

async function updateSprintComment(
  sprintId: number,
  comment: SaveCommentInput
): Promise<Comment | boolean> {
  try {
    await getPlannerBeerTrackerApi().put(
      `/sprints/${sprintId}/comments?commentId=${comment.id}`,
      comment
    );
    return true;
  } catch (putError: unknown) {
    const status = (putError as { response?: { status?: number } })?.response?.status;
    if (status === 404) {
      const created = await postCommentAndReturn(sprintId, comment);
      return created ?? true;
    }
    throw putError;
  }
}

export async function persistSprintComment(
  sprintId: number,
  comment: SaveCommentInput,
  isUpdate: boolean
): Promise<Comment | boolean> {
  if (isUpdate) {
    return updateSprintComment(sprintId, comment);
  }
  const created = await postCommentAndReturn(sprintId, comment);
  return created ?? true;
}

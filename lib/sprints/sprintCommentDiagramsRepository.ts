import {
  emptyExcalidrawCommentScene,
  EXCALIDRAW_SCENE_MAX_BYTES,
  parseExcalidrawSceneJson,
  serializeExcalidrawScene,
  trimExcalidrawSceneName,
  type ExcalidrawCommentScene,
} from '@/lib/comments/excalidrawCommentPayload';

import {
  getPlannerCommentStoredBytes,
  insertPlannerFileComment,
  overwritePlannerCommentStoredBytes,
} from './sprintPlannerFilesRepository';

const DIAGRAM_SCENE_CONTENT_TYPE = 'application/json';

export function insertSprintDiagramComment(input: {
  assigneeId: string;
  commentId: string | undefined;
  createdBy: string | null;
  day: number;
  height: number;
  name?: string;
  organizationId: string;
  part: number;
  sprintId: number;
  width: number;
}): Promise<unknown> {
  const name = trimExcalidrawSceneName(input.name);
  const data = Buffer.alloc(0);
  return insertPlannerFileComment({
    assigneeId: input.assigneeId,
    commentId: input.commentId,
    contentType: DIAGRAM_SCENE_CONTENT_TYPE,
    createdBy: input.createdBy,
    data,
    day: input.day,
    height: input.height,
    kind: 'diagram',
    organizationId: input.organizationId,
    part: input.part,
    sprintId: input.sprintId,
    storeObject: false,
    text: name ?? '',
    width: input.width,
  });
}

export async function getSprintCommentDiagramScene(input: {
  commentId: string;
  organizationId: string;
  sprintId: number;
}): Promise<ExcalidrawCommentScene | null> {
  const stored = await getPlannerCommentStoredBytes({ ...input, kind: 'diagram' });
  if (!stored) {
    return null;
  }
  if (stored.data.length === 0) {
    return emptyExcalidrawCommentScene();
  }
  return parseExcalidrawSceneJson(stored.data.toString('utf8'));
}

function assertDiagramSceneSize(serialized: string): boolean {
  return Buffer.byteLength(serialized, 'utf8') <= EXCALIDRAW_SCENE_MAX_BYTES;
}

type PutDiagramSceneResult = 'not_found' | 'ok' | 'too_large';

export async function putSprintCommentDiagramScene(input: {
  commentId: string;
  organizationId: string;
  scene: ExcalidrawCommentScene;
  sprintId: number;
}): Promise<PutDiagramSceneResult> {
  const serialized = serializeExcalidrawScene(input.scene);
  if (!assertDiagramSceneSize(serialized)) {
    return 'too_large';
  }
  const data = Buffer.from(serialized, 'utf8');
  const written = await overwritePlannerCommentStoredBytes({
    commentId: input.commentId,
    contentType: DIAGRAM_SCENE_CONTENT_TYPE,
    data,
    kind: 'diagram',
    organizationId: input.organizationId,
    sprintId: input.sprintId,
    text: trimExcalidrawSceneName(input.scene.name) ?? '',
  });
  return written ? 'ok' : 'not_found';
}

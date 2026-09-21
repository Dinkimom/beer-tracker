import { z } from 'zod';

import { MAX_PLANNER_DAY_INDEX } from '@/constants';
import {
  parseExcalidrawSceneJson,
  PLANNER_COMMENT_TEXT_MAX_LENGTH,
  type ExcalidrawCommentScene,
} from '@/lib/comments/excalidrawCommentPayload';

const CreateDiagramCommentSchema = z.object({
  assigneeId: z.string().min(1).max(255),
  day: z.number().int().min(0).max(MAX_PLANNER_DAY_INDEX),
  height: z.number().int().positive().max(2000).optional(),
  id: z.string().uuid().optional(),
  name: z.string().max(PLANNER_COMMENT_TEXT_MAX_LENGTH).optional(),
  part: z.number().int().min(0).max(2),
  width: z.number().int().positive().max(2000).optional(),
});

const ExcalidrawSceneSchema = z.object({
  appState: z.record(z.string(), z.unknown()).optional(),
  elements: z.array(z.unknown()),
  files: z.record(z.string(), z.unknown()).optional(),
  name: z.string().max(PLANNER_COMMENT_TEXT_MAX_LENGTH).optional(),
  v: z.literal(1),
});

export function parseCreateDiagramCommentBody(body: unknown):
  | {
      error: string;
      ok: false;
      status: 400;
    }
  | {
      ok: true;
      value: {
        assigneeId: string;
        commentId: string | undefined;
        day: number;
        height: number;
        name: string | undefined;
        part: number;
        width: number;
      };
    } {
  const parsed = CreateDiagramCommentSchema.safeParse(body);
  if (!parsed.success) {
    return { error: 'Validation failed', ok: false, status: 400 };
  }
  return {
    ok: true,
    value: {
      assigneeId: parsed.data.assigneeId,
      commentId: parsed.data.id,
      day: parsed.data.day,
      height: parsed.data.height ?? 1,
      name: parsed.data.name,
      part: parsed.data.part,
      width: parsed.data.width ?? 2,
    },
  };
}

export function parseDiagramSceneBody(
  body: unknown
): { error: string; ok: false; status: 400 } | { ok: true; scene: ExcalidrawCommentScene } {
  const parsed = ExcalidrawSceneSchema.safeParse(body);
  if (!parsed.success) {
    return { error: 'Invalid diagram scene', ok: false, status: 400 };
  }
  const scene = parseExcalidrawSceneJson(JSON.stringify(parsed.data));
  if (!scene) {
    return { error: 'Invalid diagram scene', ok: false, status: 400 };
  }
  return { ok: true, scene };
}

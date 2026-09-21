import type { QueryParams } from '@/types';

import { randomUUID } from 'crypto';

import { resolveCommentCreatedBy } from '@/lib/comments/commentCreatedBy';
import { DEFAULT_STICKY_NOTE_COLOR } from '@/lib/comments/stickyNoteColor';
import { pool, qualifyBeerTrackerTables, query } from '@/lib/db';
import { parseS3KeyPrefix } from '@/lib/env';
import { deletePlannerStoredObject, getPlannerObjectStore } from '@/lib/storage/getPlannerObjectStore';
import { buildPlannerObjectKey } from '@/lib/storage/plannerObjectKey';

import { ensurePlannerCommentImagesSchema } from './ensurePlannerCommentImages';
import {
  SPRINT_COMMENT_RETURNING,
  withCommentAuthors,
} from './sprintCommentsRepository';
import { sprintTenantParams, sprintTenantWhere } from './sprintTenantSql';

type PlannerFileCommentKind = 'diagram' | 'image';

interface CommentRowWithCreator {
  created_by?: string | null;
}

interface PlannerCommentFileRef {
  byteSize: number;
  contentType: string;
  fileId: string;
  storageKey: string;
}

export async function insertPlannerFileComment(input: {
  assigneeId: string;
  commentId: string | undefined;
  contentType: string;
  createdBy: string | null;
  data: Buffer;
  day: number;
  height: number;
  kind: PlannerFileCommentKind;
  organizationId: string;
  part: number;
  sprintId: number;
  /** false — только строка в БД (пустая схема до первого PUT). */
  storeObject?: boolean;
  text: string;
  width: number;
}): Promise<unknown> {
  await ensurePlannerCommentImagesSchema();
  const fileId = randomUUID();
  const storageKey = buildPlannerObjectKey(
    input.organizationId,
    fileId,
    parseS3KeyPrefix(process.env.S3_KEY_PREFIX)
  );
  const storeObject = input.storeObject !== false;
  if (storeObject) {
    await getPlannerObjectStore().putObject(storageKey, input.data, input.contentType);
  }
  try {
    return await insertPlannerFileCommentRows(input, fileId, storageKey);
  } catch (error) {
    if (storeObject) {
      await deletePlannerStoredObject(storageKey);
    }
    throw error;
  }
}

async function insertPlannerFileCommentRows(
  input: Parameters<typeof insertPlannerFileComment>[0],
  fileId: string,
  storageKey: string
): Promise<unknown> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      qualifyBeerTrackerTables(`
        INSERT INTO planner_files (
          id, organization_id, content_type, byte_size, storage_key, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `),
      [
        fileId,
        input.organizationId,
        input.contentType,
        input.data.length,
        storageKey,
        resolveCommentCreatedBy(input.createdBy),
      ]
    );
    const commentResult = await client.query<CommentRowWithCreator>(
      qualifyBeerTrackerTables(insertFileCommentSql()),
      insertFileCommentParams(input, fileId)
    );
    await client.query('COMMIT');
    const row = commentResult.rows[0];
    if (!row) {
      return undefined;
    }
    const [withAuthor] = await withCommentAuthors([row]);
    return withAuthor;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function getPlannerCommentFileRef(input: {
  commentId: string;
  kind: PlannerFileCommentKind;
  organizationId: string;
  sprintId: number;
}): Promise<PlannerCommentFileRef | null> {
  await ensurePlannerCommentImagesSchema();
  const result = await query<{
    byte_size: number;
    content_type: string;
    id: string;
    storage_key: string;
  }>(
    `SELECT f.id, f.storage_key, f.content_type, f.byte_size
       FROM planner_files f
       INNER JOIN comments c ON c.image_file_id = f.id
      WHERE ${sprintTenantWhere()}
        AND c.id = $2
        AND c.kind = $3
      LIMIT 1`,
    [...sprintTenantParams(input.sprintId), input.commentId, input.kind]
  );
  const row = result.rows[0];
  if (!row?.storage_key) {
    return null;
  }
  return {
    byteSize: Number(row.byte_size) || 0,
    contentType: row.content_type,
    fileId: row.id,
    storageKey: row.storage_key,
  };
}

export async function getPlannerCommentStoredBytes(input: {
  commentId: string;
  kind: PlannerFileCommentKind;
  organizationId: string;
  sprintId: number;
}): Promise<{ contentType: string; data: Buffer } | null> {
  const fileRef = await getPlannerCommentFileRef(input);
  if (!fileRef) {
    return null;
  }
  if (fileRef.byteSize === 0) {
    return { contentType: fileRef.contentType, data: Buffer.alloc(0) };
  }
  const stored = await getPlannerObjectStore().getObject(fileRef.storageKey);
  if (!stored) {
    return null;
  }
  return { contentType: fileRef.contentType, data: stored.body };
}

export async function overwritePlannerCommentStoredBytes(input: {
  commentId: string;
  contentType: string;
  data: Buffer;
  kind: PlannerFileCommentKind;
  organizationId: string;
  sprintId: number;
  text?: string;
}): Promise<boolean> {
  const fileRef = await getPlannerCommentFileRef(input);
  if (!fileRef) {
    return false;
  }
  await getPlannerObjectStore().putObject(fileRef.storageKey, input.data, input.contentType);
  await query('UPDATE planner_files SET byte_size = $1 WHERE id = $2', [
    input.data.length,
    fileRef.fileId,
  ]);
  if (input.text !== undefined) {
    await query(
      `UPDATE comments SET text = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2`,
      [input.text, input.commentId]
    );
  }
  return true;
}

export function insertFileCommentSql(): string {
  return `INSERT INTO comments (
             id, organization_id, sprint_id, assignee_id, text,
             position_x, position_y, day, part, width, height, color, created_by, kind, image_file_id
           ) VALUES (
             COALESCE($1, uuid_generate_v4()), $2, $3, $4, $5, 0, 0, $6, $7, $8, $9, $10, $11, $12, $13
           )
           RETURNING ${SPRINT_COMMENT_RETURNING}`;
}

function insertFileCommentParams(
  input: {
    assigneeId: string;
    commentId: string | undefined;
    createdBy: string | null;
    day: number;
    height: number;
    kind: PlannerFileCommentKind;
    organizationId: string;
    part: number;
    sprintId: number;
    text: string;
    width: number;
  },
  fileId: string
): QueryParams {
  return [
    input.commentId,
    input.organizationId,
    input.sprintId,
    input.assigneeId,
    input.text,
    input.day,
    input.part,
    input.width,
    input.height,
    DEFAULT_STICKY_NOTE_COLOR,
    resolveCommentCreatedBy(input.createdBy),
    input.kind,
    fileId,
  ];
}

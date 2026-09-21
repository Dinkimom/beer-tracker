import { EXCALIDRAW_COMMENT_PREFIX } from '@/lib/comments/excalidrawCommentPayload';
import { query } from '@/lib/db';
import { getBeerTrackerSchema } from '@/lib/env';

import {
  isIgnorableConcurrentIndexError,
  plannerFilesNeedsStorageKey,
  shouldWipePlannerFilesForS3Migration,
} from './plannerFilesS3Migration';

let schemaEnsured = false;
let schemaEnsurePromise: Promise<void> | null = null;

function qualifySchemaName(schema: string): string {
  return schema.includes('-') ? `"${schema}"` : schema;
}

/** Идемпотентно приводит planner_files / comments.kind к схеме S3 (без BYTEA). */
export async function ensurePlannerCommentImagesSchema(): Promise<void> {
  if (schemaEnsured) {
    return;
  }
  schemaEnsurePromise ??= runEnsurePlannerCommentImagesSchema();
  await schemaEnsurePromise;
}

async function runEnsurePlannerCommentImagesSchema(): Promise<void> {
  try {
    const schema = qualifySchemaName(getBeerTrackerSchema());
    await createPlannerFilesTableIfMissing(schema);
    const columns = await listPlannerFilesColumns();
    if (shouldWipePlannerFilesForS3Migration(columns)) {
      await wipeByteaPlannerFiles();
    }
    if (plannerFilesNeedsStorageKey(await listPlannerFilesColumns())) {
      await addPlannerFilesStorageKey();
    }
    await createPlannerFilesStorageKeyIndex(schema);
    await ensureCommentsKindIncludesDiagram(schema);
    await ensureCommentsParentColumn(schema);
    schemaEnsured = true;
  } catch (error) {
    schemaEnsurePromise = null;
    throw error;
  }
}

async function createPlannerFilesStorageKeyIndex(schema: string): Promise<void> {
  try {
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_planner_files_storage_key
        ON ${schema}.planner_files (storage_key)
    `);
  } catch (error) {
    if (!isIgnorableConcurrentIndexError(error)) {
      throw error;
    }
  }
}

async function createPlannerFilesTableIfMissing(schema: string): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS ${schema}.planner_files (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
      content_type VARCHAR(64) NOT NULL,
      byte_size INTEGER NOT NULL,
      storage_key TEXT NOT NULL,
      created_by UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_planner_files_org
      ON ${schema}.planner_files (organization_id)
  `);
}

async function listPlannerFilesColumns(): Promise<string[]> {
  const result = await query<{ column_name: string }>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = 'planner_files'`,
    [getBeerTrackerSchema()]
  );
  return result.rows.map((row) => row.column_name);
}

async function wipeByteaPlannerFiles(): Promise<void> {
  await query(
    `DELETE FROM comments
      WHERE kind = 'image'
         OR text LIKE $1`,
    [`${EXCALIDRAW_COMMENT_PREFIX}%`]
  );
  await query('DELETE FROM planner_files');
  await query('ALTER TABLE planner_files DROP COLUMN IF EXISTS data');
}

async function addPlannerFilesStorageKey(): Promise<void> {
  await query('ALTER TABLE planner_files ADD COLUMN IF NOT EXISTS storage_key TEXT');
  await query(
    `UPDATE planner_files
        SET storage_key = id::text
      WHERE storage_key IS NULL`
  );
  await query('ALTER TABLE planner_files ALTER COLUMN storage_key SET NOT NULL');
}

async function ensureCommentsKindIncludesDiagram(schema: string): Promise<void> {
  await query(`
    ALTER TABLE ${schema}.comments
      ADD COLUMN IF NOT EXISTS kind VARCHAR(16) NOT NULL DEFAULT 'text'
  `);
  await query(`
    ALTER TABLE ${schema}.comments
      DROP CONSTRAINT IF EXISTS comments_kind_check
  `);
  await query(`
    ALTER TABLE ${schema}.comments
      ADD CONSTRAINT comments_kind_check
      CHECK (kind IN ('text', 'image', 'diagram'))
  `);
  await query(`
    ALTER TABLE ${schema}.comments
      ADD COLUMN IF NOT EXISTS image_file_id UUID REFERENCES planner_files (id)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_comments_image_file
      ON ${schema}.comments (image_file_id)
      WHERE image_file_id IS NOT NULL
  `);
}

async function ensureCommentsParentColumn(schema: string): Promise<void> {
  await query(`
    ALTER TABLE ${schema}.comments
      ADD COLUMN IF NOT EXISTS parent JSONB
  `);
}

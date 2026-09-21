import type { QueryParams } from '@/types';

import { pool, qualifyBeerTrackerTables, query } from '@/lib/db';

const DOCUMENT_LIST_SELECT = `
        d.id,
        d.name,
        d.content,
        d.document_type_id as "documentTypeId",
        dt.code as type,
        dt.icon_name as "iconName",
        dt.editor_type as "editorType",
        d.display_order as "displayOrder",
        d.created_at as "createdAt",
        d.updated_at as "updatedAt"`;

const DOCUMENT_INSERT_RETURNING = `
         id,
         name,
         content,
         document_type_id as "documentTypeId",
         display_order as "displayOrder",
         created_at as "createdAt",
         updated_at as "updatedAt"`;

export async function listFeatureDocuments(featureId: string): Promise<unknown[]> {
  const result = await query(
    `SELECT ${DOCUMENT_LIST_SELECT}
      FROM feature_documents d
      JOIN document_types dt ON d.document_type_id = dt.id
      WHERE d.feature_id = $1
      ORDER BY d.display_order ASC, d.created_at ASC`,
    [featureId]
  );
  return result.rows;
}

export async function fetchFeatureDocumentById(
  featureId: string,
  documentId: string
): Promise<unknown | null> {
  const result = await query(
    `SELECT ${DOCUMENT_LIST_SELECT}
      FROM feature_documents d
      JOIN document_types dt ON d.document_type_id = dt.id
      WHERE d.id = $1 AND d.feature_id = $2`,
    [documentId, featureId]
  );
  return result.rows[0] ?? null;
}

export async function fetchDocumentTypeByCode(
  typeCode: string
): Promise<{ content_format: string; id: string } | null> {
  const result = await query(
    `SELECT id, content_format FROM document_types WHERE code = $1`,
    [typeCode]
  );
  return (result.rows[0] as { content_format: string; id: string } | undefined) ?? null;
}

export async function fetchDocumentTypeMetaById(
  documentTypeId: string
): Promise<{ code: string; editorType: string; iconName: string } | null> {
  const result = await query(
    `SELECT code, icon_name as "iconName", editor_type as "editorType"
       FROM document_types
       WHERE id = $1`,
    [documentTypeId]
  );
  return (result.rows[0] as { code: string; editorType: string; iconName: string } | undefined) ?? null;
}

export async function nextFeatureDocumentDisplayOrder(featureId: string): Promise<number> {
  const result = await query(
    `SELECT COALESCE(MAX(display_order), -1) + 1 as next_order
       FROM feature_documents
       WHERE feature_id = $1`,
    [featureId]
  );
  return (result.rows[0] as { next_order?: number } | undefined)?.next_order ?? 0;
}

export async function insertFeatureDocument(input: {
  content: string;
  displayOrder: number;
  documentTypeId: string;
  featureId: string;
  name: string;
}): Promise<unknown> {
  const result = await query(
    `INSERT INTO feature_documents (feature_id, document_type_id, name, content, display_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${DOCUMENT_INSERT_RETURNING}`,
    [input.featureId, input.documentTypeId, input.name, input.content, input.displayOrder]
  );
  return result.rows[0];
}

export async function updateFeatureDocumentById(input: {
  content?: string;
  documentId: string;
  featureId: string;
  name?: string;
}): Promise<unknown | null> {
  const updates: string[] = [];
  const values: QueryParams = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.content !== undefined) {
    updates.push(`content = $${paramIndex++}`);
    values.push(input.content);
  }
  if (updates.length === 0) {
    return null;
  }

  values.push(input.documentId, input.featureId);

  const result = await query(
    `UPDATE feature_documents
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex} AND feature_id = $${paramIndex + 1}
       RETURNING ${DOCUMENT_INSERT_RETURNING}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function deleteFeatureDocumentById(
  featureId: string,
  documentId: string
): Promise<boolean> {
  const result = await query(
    `DELETE FROM feature_documents
       WHERE id = $1 AND feature_id = $2
       RETURNING id`,
    [documentId, featureId]
  );
  return result.rows.length > 0;
}

export async function reorderFeatureDocuments(
  featureId: string,
  documentIds: string[]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < documentIds.length; i++) {
      await client.query(
        qualifyBeerTrackerTables(`UPDATE feature_documents
           SET display_order = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND feature_id = $3`),
        [i, documentIds[i], featureId]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function featureDocumentExists(
  featureId: string,
  documentId: string
): Promise<boolean> {
  const result = await query(
    `SELECT id FROM feature_documents
       WHERE id = $1 AND feature_id = $2`,
    [documentId, featureId]
  );
  return result.rows.length > 0;
}

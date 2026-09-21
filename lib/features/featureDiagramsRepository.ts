import type { QueryParams } from '@/types';

import { pool, qualifyBeerTrackerTables, query } from '@/lib/db';

const DIAGRAM_SELECT = `
        id,
        name,
        content::text as content,
        display_order as "displayOrder",
        created_at as "createdAt",
        updated_at as "updatedAt"`;

export async function listFeatureDiagrams(featureId: string): Promise<unknown[]> {
  const result = await query(
    `SELECT ${DIAGRAM_SELECT}
      FROM feature_diagrams
      WHERE feature_id = $1
      ORDER BY display_order ASC, created_at ASC`,
    [featureId]
  );
  return result.rows;
}

export async function fetchFeatureDiagramById(
  featureId: string,
  diagramId: string
): Promise<unknown | null> {
  const result = await query(
    `SELECT ${DIAGRAM_SELECT}
      FROM feature_diagrams
      WHERE id = $1 AND feature_id = $2`,
    [diagramId, featureId]
  );
  return result.rows[0] ?? null;
}

export async function nextFeatureDiagramDisplayOrder(featureId: string): Promise<number> {
  const result = await query(
    `SELECT COALESCE(MAX(display_order), -1) + 1 as next_order
       FROM feature_diagrams
       WHERE feature_id = $1`,
    [featureId]
  );
  return (result.rows[0] as { next_order?: number } | undefined)?.next_order ?? 0;
}

export async function insertFeatureDiagram(input: {
  content: unknown;
  displayOrder: number;
  featureId: string;
  name: string;
}): Promise<unknown> {
  const result = await query(
    `INSERT INTO feature_diagrams (feature_id, name, content, display_order)
       VALUES ($1, $2, $3::jsonb, $4)
       RETURNING ${DIAGRAM_SELECT}`,
    [input.featureId, input.name, JSON.stringify(input.content), input.displayOrder]
  );
  return result.rows[0];
}

export async function updateFeatureDiagramById(input: {
  content?: unknown;
  diagramId: string;
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
    updates.push(`content = $${paramIndex++}::jsonb`);
    values.push(JSON.stringify(input.content));
  }
  if (updates.length === 0) {
    return null;
  }

  values.push(input.diagramId, input.featureId);

  const result = await query(
    `UPDATE feature_diagrams
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex} AND feature_id = $${paramIndex + 1}
       RETURNING ${DIAGRAM_SELECT}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function deleteFeatureDiagramById(
  featureId: string,
  diagramId: string
): Promise<boolean> {
  const result = await query(
    `DELETE FROM feature_diagrams
       WHERE id = $1 AND feature_id = $2
       RETURNING id`,
    [diagramId, featureId]
  );
  return result.rows.length > 0;
}

export async function reorderFeatureDiagrams(
  featureId: string,
  diagramIds: string[]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < diagramIds.length; i++) {
      await client.query(
        qualifyBeerTrackerTables(`UPDATE feature_diagrams
           SET display_order = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND feature_id = $3`),
        [i, diagramIds[i], featureId]
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

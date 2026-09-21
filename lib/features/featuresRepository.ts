import type { QueryParams } from '@/types';

import { pool, qualifyBeerTrackerTables, query } from '@/lib/db';

interface SqlUpdateBuilder {
  paramIndex: number;
  updateFields: string[];
  updateValues: QueryParams;
}

function pushSqlUpdate(
  builder: SqlUpdateBuilder,
  defined: boolean,
  columnSql: string,
  value: QueryParams[number]
): void {
  if (!defined) {
    return;
  }
  builder.updateFields.push(`${columnSql} = $${builder.paramIndex++}`);
  builder.updateValues.push(value);
}

export function buildFeatureUpdateSql(updates: {
  description?: string;
  name?: string;
  responsibleByPlatform?: unknown;
  status?: string;
  tasks?: unknown;
}): { error: 'empty' } | { updateFields: string[]; updateValues: unknown[] } {
  const builder: SqlUpdateBuilder = { paramIndex: 1, updateFields: [], updateValues: [] };
  pushSqlUpdate(builder, updates.name !== undefined, 'name', updates.name!);
  pushSqlUpdate(builder, updates.description !== undefined, 'description', updates.description!);
  pushSqlUpdate(builder, updates.status !== undefined, 'status', updates.status!);
  if (updates.responsibleByPlatform !== undefined) {
    builder.updateFields.push(`responsible_by_platform = $${builder.paramIndex++}::jsonb`);
    builder.updateValues.push(JSON.stringify(updates.responsibleByPlatform));
  }
  if (updates.tasks !== undefined) {
    builder.updateFields.push(`tasks = $${builder.paramIndex++}::jsonb`);
    builder.updateValues.push(JSON.stringify(updates.tasks));
  }
  if (builder.updateFields.length === 0) {
    return { error: 'empty' };
  }
  return { updateFields: builder.updateFields, updateValues: builder.updateValues };
}

const FEATURE_SELECT_COLUMNS = `
        id,
        board_id as "boardId",
        name,
        description,
        status,
        responsible_by_platform as "responsibleByPlatform",
        tasks,
        created_at as "createdAt",
        updated_at as "updatedAt"`;

export async function listFeaturesByBoardId(boardId: number): Promise<unknown[]> {
  const result = await query(
    `SELECT ${FEATURE_SELECT_COLUMNS}
      FROM features
      WHERE board_id = $1
      ORDER BY updated_at DESC, created_at DESC`,
    [boardId]
  );
  return result.rows;
}

export async function fetchFeatureById(featureId: string): Promise<unknown | null> {
  const result = await query(
    `SELECT ${FEATURE_SELECT_COLUMNS}
      FROM features
      WHERE id = $1`,
    [featureId]
  );
  return result.rows[0] ?? null;
}

export async function insertFeature(input: {
  boardId: number;
  description: string;
  name: string;
  responsibleByPlatform: unknown;
  status: string;
}): Promise<unknown> {
  const result = await query(
    `INSERT INTO features (board_id, name, description, status, responsible_by_platform, tasks)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
       RETURNING ${FEATURE_SELECT_COLUMNS}`,
    [
      input.boardId,
      input.name,
      input.description,
      input.status,
      JSON.stringify(input.responsibleByPlatform),
      JSON.stringify([]),
    ]
  );
  return result.rows[0];
}

export async function updateFeatureById(
  featureId: string,
  updateFields: string[],
  updateValues: unknown[]
): Promise<unknown | null> {
  const featureIdParamIndex = updateValues.length + 1;
  const params = [...updateValues, featureId] as QueryParams;
  const result = await query(
    `UPDATE features 
       SET ${updateFields.join(', ')}
       WHERE id = $${featureIdParamIndex}
       RETURNING ${FEATURE_SELECT_COLUMNS}`,
    params
  );
  return result.rows[0] ?? null;
}

export async function deleteFeatureCascade(featureId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      qualifyBeerTrackerTables('DELETE FROM feature_documents WHERE feature_id = $1'),
      [featureId]
    );
    await client.query(
      qualifyBeerTrackerTables('DELETE FROM feature_diagrams WHERE feature_id = $1'),
      [featureId]
    );
    const result = await client.query(
      qualifyBeerTrackerTables('DELETE FROM features WHERE id = $1 RETURNING id'),
      [featureId]
    );
    await client.query('COMMIT');
    return result.rows.length > 0;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

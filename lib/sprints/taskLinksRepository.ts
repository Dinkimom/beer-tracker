import { query } from '@/lib/db';

import { sprintTenantParams, sprintTenantWhere } from './sprintTenantSql';
import { buildTaskLinksBatchDeleteSql, buildTaskLinksBatchInsert } from './taskLinksBatchSql';

export async function listTaskLinksForSprint(input: {
  organizationId: string;
  sprintId: number;
}): Promise<unknown[]> {
  const result = await query(
    `SELECT 
        id,
        from_task_id,
        to_task_id,
        from_anchor,
        to_anchor,
        created_at
      FROM task_links 
      WHERE ${sprintTenantWhere()}
      ORDER BY created_at`,
    sprintTenantParams(input.sprintId)
  );
  return result.rows;
}

export function upsertTaskLinkSql(): string {
  return `INSERT INTO task_links (id, organization_id, sprint_id, from_task_id, to_task_id, from_anchor, to_anchor)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (organization_id, sprint_id, from_task_id, to_task_id)
           DO UPDATE SET
             from_anchor = EXCLUDED.from_anchor,
             to_anchor = EXCLUDED.to_anchor
           RETURNING *`;
}

export async function upsertTaskLink(input: {
  fromAnchor: string | null | undefined;
  fromTaskId: string;
  linkId: string;
  organizationId: string;
  sprintId: number;
  toAnchor: string | null | undefined;
  toTaskId: string;
}): Promise<unknown> {
  const result = await query(upsertTaskLinkSql(), [
    input.linkId,
    input.organizationId,
    input.sprintId,
    input.fromTaskId,
    input.toTaskId,
    input.fromAnchor || null,
    input.toAnchor || null,
  ]);
  return result.rows[0];
}

export async function deleteTaskLink(input: {
  linkId: string;
  organizationId: string;
  sprintId: number;
}): Promise<void> {
  await query('DELETE FROM task_links WHERE sprint_id = $1 AND id = $2', [
    input.sprintId,
    input.linkId,
  ]);
}

export async function clearTaskLinksForSprint(input: {
  organizationId: string;
  sprintId: number;
}): Promise<void> {
  await query('DELETE FROM task_links WHERE sprint_id = $1', [input.sprintId]);
}

export async function persistBatchTaskLinks(params: {
  links: Array<{
    fromAnchor?: string | null;
    fromTaskId: string;
    id: string;
    toAnchor?: string | null;
    toTaskId: string;
  }>;
  organizationId: number | string;
  sprintId: number;
}): Promise<number> {
  await query('BEGIN');
  try {
    const linkIds = params.links.map((l) => l.id);
    if (linkIds.length > 0) {
      const placeholders = linkIds.map((_, i) => `$${i + 2}`).join(', ');
      await query(buildTaskLinksBatchDeleteSql(placeholders), [params.sprintId, ...linkIds]);
    }

    const { params: insertParams, sql: insertSql } = buildTaskLinksBatchInsert(
      params.links,
      params.organizationId,
      params.sprintId
    );
    await query(insertSql, insertParams);
    await query('COMMIT');
    return params.links.length;
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
}

function buildBatchLinksSelectQuery(): string {
  return `SELECT 
    sprint_id,
    id,
    from_task_id,
    to_task_id,
    from_anchor,
    to_anchor,
    created_at
  FROM task_links 
  WHERE sprint_id = ANY($1::int[])
  ORDER BY sprint_id, created_at`;
}

export async function fetchTaskLinksForSprintIds(input: {
  organizationId: string;
  sprintIds: number[];
}): Promise<Array<Record<string, unknown> & { sprint_id: number }>> {
  const result = await query(buildBatchLinksSelectQuery(), [input.sprintIds]);
  return result.rows as Array<Record<string, unknown> & { sprint_id: number }>;
}

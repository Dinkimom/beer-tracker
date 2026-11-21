import type { BeerTrackerTransactionQuery } from '@/lib/db';

import { query, runBeerTrackerTransaction } from '@/lib/db';

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
    sprintTenantParams(input)
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

export async function upsertTaskLink(
  input: {
    fromAnchor: string | null | undefined;
    fromTaskId: string;
    linkId: string;
    organizationId: string;
    sprintId: number;
    toAnchor: string | null | undefined;
    toTaskId: string;
  },
  run: BeerTrackerTransactionQuery = query
): Promise<unknown> {
  const result = await run(upsertTaskLinkSql(), [
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

export async function deleteTaskLink(
  input: {
    linkId: string;
    organizationId: string;
    sprintId: number;
  },
  run: BeerTrackerTransactionQuery = query
): Promise<void> {
  await run(`DELETE FROM task_links WHERE ${sprintTenantWhere()} AND id = $3`, [
    ...sprintTenantParams(input),
    input.linkId,
  ]);
}

/** Все стрелки, у которых задача на одном из концов. */
export async function deleteTaskLinksForTask(
  input: {
    organizationId: string;
    sprintId: number;
    taskId: string;
  },
  run: BeerTrackerTransactionQuery = query
): Promise<void> {
  await run(`DELETE FROM task_links WHERE ${sprintTenantWhere()} AND (from_task_id = $3 OR to_task_id = $3)`, [
    ...sprintTenantParams(input),
    input.taskId,
  ]);
}

export async function clearTaskLinksForSprint(
  input: {
    organizationId: string;
    sprintId: number;
  },
  run: BeerTrackerTransactionQuery = query
): Promise<void> {
  await run(`DELETE FROM task_links WHERE ${sprintTenantWhere()}`, sprintTenantParams(input));
}

/** Пакетная запись стрелок (удалить по id и вставить заново) — в транзакции `run` или своей. */
export async function persistBatchTaskLinks(
  params: {
    links: Array<{
      fromAnchor?: string | null;
      fromTaskId: string;
      id: string;
      toAnchor?: string | null;
      toTaskId: string;
    }>;
    organizationId: number | string;
    sprintId: number;
  },
  run?: BeerTrackerTransactionQuery
): Promise<number> {
  if (!run) {
    return runBeerTrackerTransaction((tx) => persistBatchTaskLinks(params, tx));
  }
  const linkIds = params.links.map((l) => l.id);
  if (linkIds.length === 0) {
    return 0;
  }
  await run(buildTaskLinksBatchDeleteSql(), [String(params.organizationId), params.sprintId, linkIds]);

  const { params: insertParams, sql: insertSql } = buildTaskLinksBatchInsert(
    params.links,
    params.organizationId,
    params.sprintId
  );
  await run(insertSql, insertParams);
  return params.links.length;
}

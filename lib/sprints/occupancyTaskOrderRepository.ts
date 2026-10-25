import { query } from '@/lib/db';

import { sprintTenantParams, sprintTenantWhere } from './sprintTenantSql';

interface OccupancyTaskOrderPayload {
  parentIds: unknown[];
  taskOrders: Record<string, unknown>;
}

export async function fetchOccupancyTaskOrder(input: {
  organizationId: string;
  sprintId: number;
}): Promise<OccupancyTaskOrderPayload | null> {
  const result = await query(
    `SELECT parent_ids as "parentIds", task_orders as "taskOrders"
       FROM occupancy_task_order
       WHERE ${sprintTenantWhere()}`,
    sprintTenantParams(input.sprintId)
  );

  const row = result.rows[0] as { parentIds?: unknown[]; taskOrders?: Record<string, unknown> } | undefined;
  if (!row) {
    return null;
  }
  return {
    parentIds: row.parentIds ?? [],
    taskOrders: row.taskOrders ?? {},
  };
}

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

export function upsertOccupancyTaskOrderSql(): string {
  return `INSERT INTO occupancy_task_order (organization_id, sprint_id, parent_ids, task_orders)
           VALUES ($1, $2, $3::jsonb, $4::jsonb)
           ON CONFLICT (organization_id, sprint_id)
           DO UPDATE SET parent_ids = $3::jsonb, task_orders = $4::jsonb, updated_at = CURRENT_TIMESTAMP`;
}

export async function upsertOccupancyTaskOrder(input: {
  order: OccupancyTaskOrderPayload;
  organizationId: string;
  sprintId: number;
}): Promise<void> {
  const parentIdsJson = JSON.stringify(input.order.parentIds);
  const taskOrdersJson = JSON.stringify(input.order.taskOrders);

  await query(upsertOccupancyTaskOrderSql(), [
    input.organizationId,
    input.sprintId,
    parentIdsJson,
    taskOrdersJson,
  ]);
}

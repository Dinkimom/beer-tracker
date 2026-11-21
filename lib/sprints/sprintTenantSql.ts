/**
 * WHERE для строк доски спринта. Номера спринтов у трекеров пересекаются между организациями,
 * поэтому спринт всегда ищется внутри организации: `$1` — организация, `$2` — спринт.
 */
export function sprintTenantWhere(): string {
  return 'organization_id = $1 AND sprint_id = $2';
}

export function sprintTenantParams(input: { organizationId: string; sprintId: number }): [string, number] {
  return [input.organizationId, input.sprintId];
}

/** Строки спринта с `task_id` из списка: `$3` — массив id задач. */
export function buildSprintTaskIdsScopeQuery(input: {
  organizationId: string;
  sprintId: number;
  taskIds: readonly string[];
}): { params: [string, number, string[]]; scopeSql: string } {
  return {
    params: [input.organizationId, input.sprintId, [...input.taskIds]],
    scopeSql: `${sprintTenantWhere()} AND task_id = ANY($3::text[])`,
  };
}

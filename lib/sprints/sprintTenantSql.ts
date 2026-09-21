/** WHERE для строк, привязанных к спринту (on-prem: только sprint_id). */
export function sprintTenantWhere(): string {
  return 'sprint_id = $1';
}

export function sprintTenantParams(sprintId: number): [number] {
  return [sprintId];
}

export function buildSprintTaskIdsScopeQuery(
  sprintId: number,
  taskIds: string[]
): { params: Array<number | string>; scopeSql: string } {
  const placeholders = taskIds.map((_, i) => `$${i + 2}`).join(', ');
  const scopeSql = `sprint_id = $1 AND task_id IN (${placeholders})`;
  const params = [sprintId, ...taskIds];
  return { params, scopeSql };
}

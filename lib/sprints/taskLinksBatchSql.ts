function taskLinksDeleteWhere(placeholders: string): string {
  return `sprint_id = $1 AND id IN (${placeholders})`;
}

export function buildTaskLinksBatchDeleteSql(placeholders: string): string {
  return `DELETE FROM task_links WHERE ${taskLinksDeleteWhere(placeholders)}`;
}

interface BatchLinkInput {
  fromAnchor?: string | null;
  fromTaskId: string;
  id: string;
  toAnchor?: string | null;
  toTaskId: string;
}

type TaskLinkSqlParam = number | string | null;
type TaskLinkSqlParams = TaskLinkSqlParam[];

function taskLinkInsertRowPlaceholders(baseIndex: number): string {
  return `($${baseIndex}, $${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
}

function pushTaskLinkInsertParams(
  params: TaskLinkSqlParams,
  link: BatchLinkInput,
  organizationId: number | string,
  sprintId: number
): void {
  params.push(
    link.id,
    organizationId,
    sprintId,
    link.fromTaskId,
    link.toTaskId,
    link.fromAnchor ?? null,
    link.toAnchor ?? null
  );
}

export function buildTaskLinksBatchInsert(
  links: BatchLinkInput[],
  organizationId: number | string,
  sprintId: number
): { params: TaskLinkSqlParams; sql: string; valuesParts: string[] } {
  const valuesParts: string[] = [];
  const params: TaskLinkSqlParams = [];
  const paramsPerRow = 7;

  links.forEach((link, index) => {
    const baseIndex = index * paramsPerRow + 1;
    valuesParts.push(taskLinkInsertRowPlaceholders(baseIndex));
    pushTaskLinkInsertParams(params, link, organizationId, sprintId);
  });

  const sql = `INSERT INTO task_links (
         id, organization_id, sprint_id, from_task_id, to_task_id, from_anchor, to_anchor
       ) VALUES ${valuesParts.join(', ')}
       ON CONFLICT (organization_id, sprint_id, from_task_id, to_task_id)
       DO UPDATE SET
         from_anchor = EXCLUDED.from_anchor,
         to_anchor = EXCLUDED.to_anchor`;

  return { params, sql, valuesParts };
}

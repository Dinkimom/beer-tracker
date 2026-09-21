/**
 * Поля задачи в issue_snapshots: envelope → payload, legacy flat → как есть.
 */
export const ISSUE_SNAPSHOT_FIELDS_JSONB_SQL =
  `(CASE WHEN payload ? 'schemaVersion' AND payload ? 'payload' THEN payload->'payload' ELSE payload END)`;

/**
 * SQL-фильтр спринта в JSONB (паритет с issueDataSprintContains в sprintMembership.ts).
 * @param issueJsonbSql — выражение jsonb (например `issue_data` или envelope unwrap)
 * @param sprintIdParam — плейсхолдер $N для id спринта (text)
 * @param sprintNameParam — плейсхолдер $M для display спринта (text)
 */
export function issueJsonbSprintWhereSql(
  issueJsonbSql: string,
  sprintIdParam: number,
  sprintNameParam: number
): string {
  const id = `$${sprintIdParam}`;
  const name = `$${sprintNameParam}`;
  const col = issueJsonbSql;
  const elemMatch = `(
    elem->>'id' = ${id}
    OR lower(coalesce(elem->>'display', '')) = lower(${name})
    OR lower(coalesce(elem->>'key', '')) = lower(${name})
  )`;

  const fieldMatch = (field: 'sprint' | 'sprints') => `(
    jsonb_typeof(${col}->'${field}') = 'array'
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(${col}->'${field}') AS elem
      WHERE ${elemMatch}
    )
    OR jsonb_typeof(${col}->'${field}') = 'object'
    AND (
      ${col}->'${field}'->>'id' = ${id}
      OR lower(coalesce(${col}->'${field}'->>'display', '')) = lower(${name})
      OR lower(coalesce(${col}->'${field}'->>'key', '')) = lower(${name})
    )
    OR jsonb_typeof(${col}->'${field}') = 'string'
    AND (
      ${col}->>'${field}' = ${id}
      OR lower(${col}->>'${field}') = lower(${name})
    )
  )`;

  return `(${fieldMatch('sprint')} OR ${fieldMatch('sprints')})`;
}

export function overseerIssueDataSprintWhereSql(
  sprintIdParam: number,
  sprintNameParam: number
): string {
  return issueJsonbSprintWhereSql('issue_data', sprintIdParam, sprintNameParam);
}

import { ISSUE_SNAPSHOT_FIELDS_JSONB_SQL } from './overseerIssueDataSprintSql';

/**
 * SQL-фильтр очереди в payload issue_snapshots (паритет с issuePayloadMatchesQueueFilter).
 * @param paramIndex — номер плейсхолдера $N для ключа очереди
 */
export function issueSnapshotQueueWhereSql(paramIndex: number): string {
  const fields = ISSUE_SNAPSHOT_FIELDS_JSONB_SQL;
  const p = `$${paramIndex}`;
  return `(
    ${fields}->>'queue' = ${p}
    OR ${fields}->'queue'->>'key' = ${p}
    OR ${fields}->'queue'->>'id' = ${p}
  )`;
}

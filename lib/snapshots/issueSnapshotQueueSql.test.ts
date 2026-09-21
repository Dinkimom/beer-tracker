import { describe, expect, it } from 'vitest';

import { issueSnapshotQueueWhereSql } from './issueSnapshotQueueSql';

describe('issueSnapshotQueueWhereSql', () => {
  it('uses parameterized queue match on unwrapped snapshot payload', () => {
    const sql = issueSnapshotQueueWhereSql(2);
    expect(sql).toContain("->>'queue' = $2");
    expect(sql).toContain("->'queue'->>'key' = $2");
    expect(sql).toContain("->'queue'->>'id' = $2");
    expect(sql).toContain("payload ? 'schemaVersion'");
  });
});

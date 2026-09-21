import { describe, expect, it } from 'vitest';

import {
  ISSUE_SNAPSHOT_FIELDS_JSONB_SQL,
  issueJsonbSprintWhereSql,
  overseerIssueDataSprintWhereSql,
} from './overseerIssueDataSprintSql';

describe('overseerIssueDataSprintWhereSql', () => {
  it('uses parameterized sprint id and name on issue_data', () => {
    const sql = overseerIssueDataSprintWhereSql(1, 2);
    expect(sql).toContain("issue_data->'sprint'");
    expect(sql).toContain("issue_data->'sprints'");
    expect(sql).toContain("elem->>'id' = $1");
    expect(sql).toContain('lower($2)');
  });
});

describe('issueJsonbSprintWhereSql', () => {
  it('applies the same sprint match to a snapshot envelope unwrap', () => {
    const sql = issueJsonbSprintWhereSql(ISSUE_SNAPSHOT_FIELDS_JSONB_SQL, 2, 3);
    expect(sql).toContain(ISSUE_SNAPSHOT_FIELDS_JSONB_SQL);
    expect(sql).toContain("elem->>'id' = $2");
    expect(sql).toContain('lower($3)');
  });
});

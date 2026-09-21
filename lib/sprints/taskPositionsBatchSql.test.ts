import { describe, expect, it } from 'vitest';

import {
  buildTaskPositionSegmentUpsertSql,
  buildTaskPositionsBatchInsertSql,
  buildTaskPositionsUpsertSql,
} from './taskPositionsBatchSql';

describe('task position upsert SQL', () => {
  it('targets the organization-scoped primary key', () => {
    const sql = buildTaskPositionsUpsertSql();
    expect(sql).toContain('INSERT INTO task_positions');
    expect(sql).toContain('organization_id, sprint_id, task_id');
    expect(sql).toContain('ON CONFLICT (organization_id, sprint_id, task_id)');
    expect(sql).not.toContain('ON CONFLICT (sprint_id, task_id)');
  });

  it('uses the same conflict target for batch insert', () => {
    const sql = buildTaskPositionsBatchInsertSql('($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)');
    expect(sql).toContain('ON CONFLICT (organization_id, sprint_id, task_id)');
    expect(sql).not.toContain('ON CONFLICT (sprint_id, task_id)');
  });

  it('targets the organization-scoped segment primary key', () => {
    const sql = buildTaskPositionSegmentUpsertSql();
    expect(sql).toContain('ON CONFLICT (organization_id, sprint_id, task_id, segment_index)');
    expect(sql).not.toContain('ON CONFLICT (sprint_id, task_id, segment_index)');
  });
});

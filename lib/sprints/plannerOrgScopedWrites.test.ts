import { describe, expect, it } from 'vitest';

import { upsertFeatureLanesSql } from './featureLanesRepository';
import { upsertOccupancyTaskOrderSql } from './occupancyTaskOrderRepository';
import { insertSprintCommentSql, moveSprintCommentsSql, updateSprintCommentSql } from './sprintCommentsRepository';
import { insertFileCommentSql } from './sprintPlannerFilesRepository';
import { buildTaskLinksBatchInsert } from './taskLinksBatchSql';
import { upsertTaskLinkSql } from './taskLinksRepository';

describe('planner writes include organization_id', () => {
  it('inserts comments with organization_id', () => {
    expect(insertSprintCommentSql()).toContain('organization_id, sprint_id, assignee_id');
    expect(insertSprintCommentSql()).toContain('image_file_id, parent');
    expect(insertSprintCommentSql()).toContain(
      'pending_approval, pending_approval_expires_at, plan_patch_proposal_id'
    );
    expect(moveSprintCommentsSql()).toBe(
      'UPDATE comments SET sprint_id = $2 WHERE sprint_id = $1 AND id = ANY($3::uuid[])'
    );
    expect(moveSprintCommentsSql()).not.toContain('organization_id');
    expect(insertFileCommentSql()).toContain('organization_id, sprint_id, assignee_id');
    expect(updateSprintCommentSql()).toContain(
      'parent = CASE WHEN $10 THEN $11::jsonb ELSE parent END'
    );
    expect(updateSprintCommentSql()).toContain('WHERE sprint_id = $12 AND id = $13');
  });

  it('upserts occupancy order on the organization-scoped primary key', () => {
    const sql = upsertOccupancyTaskOrderSql();
    expect(sql).toContain('ON CONFLICT (organization_id, sprint_id)');
    expect(sql).not.toContain('ON CONFLICT (sprint_id)');
  });

  it('upserts feature lanes on the organization-scoped primary key', () => {
    const sql = upsertFeatureLanesSql();
    expect(sql).toContain('ON CONFLICT (organization_id, sprint_id)');
    expect(sql).not.toContain('ON CONFLICT (sprint_id)');
  });

  it('upserts task links on the organization-scoped unique key', () => {
    expect(upsertTaskLinkSql()).toContain(
      'ON CONFLICT (organization_id, sprint_id, from_task_id, to_task_id)'
    );
    const batch = buildTaskLinksBatchInsert(
      [{ fromTaskId: 'A', id: 'l1', toTaskId: 'B' }],
      '11111111-1111-4111-8111-111111111111',
      78777
    );
    expect(batch.sql).toContain('ON CONFLICT (organization_id, sprint_id, from_task_id, to_task_id)');
    expect(batch.params[1]).toBe('11111111-1111-4111-8111-111111111111');
  });
});

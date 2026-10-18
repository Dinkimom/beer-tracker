import type { PlanPatchPositionPreview } from './sprintPlanPatchPositionPreview';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteTaskPosition, upsertTaskPositionRecord } from '@/lib/sprints/taskPositionsRepository';

import {
  deletePlanPatchPositionPreviews,
  listPlanPatchPositionPreviews,
} from './sprintPlanPatchPositionPreviewRepository';
import { approvePlanPatchPositionPreviews, rejectPlanPatchPositionPreviews } from './sprintPlanPatchPreviewActions';

vi.mock('@/lib/sprints/taskPositionsRepository', () => ({
  deleteTaskPosition: vi.fn(),
  upsertTaskPositionRecord: vi.fn(),
}));

vi.mock('./sprintPlanPatchPositionPreviewRepository', () => ({
  deletePlanPatchPositionPreviews: vi.fn(),
  listPlanPatchPositionPreviews: vi.fn(),
}));

const list = vi.mocked(listPlanPatchPositionPreviews);
const remove = vi.mocked(deletePlanPatchPositionPreviews);
const upsert = vi.mocked(upsertTaskPositionRecord);
const dropPosition = vi.mocked(deleteTaskPosition);

const move: PlanPatchPositionPreview = {
  assigneeId: 'dev-1',
  changes: ['schedule'],
  duration: 2,
  remove: false,
  startDay: 3,
  startPart: 0,
  taskId: 'RND-1',
};

describe('plan patch preview actions', () => {
  beforeEach(() => {
    list.mockReset();
    remove.mockReset();
    upsert.mockReset();
    dropPosition.mockReset();
    remove.mockResolvedValue(1);
    upsert.mockResolvedValue({ rows: [] });
  });

  it('writes one placement and drops that preview', async () => {
    list.mockResolvedValue([move]);
    await expect(
      approvePlanPatchPositionPreviews({
        organizationId: 'org',
        sprintId: 1221,
        taskId: 'RND-1',
      })
    ).resolves.toBe(1);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'RND-1', startDay: 3 }));
    expect(remove).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'RND-1' }));
  });

  it('deletes the board position for a removal preview', async () => {
    list.mockResolvedValue([{ ...move, remove: true, taskId: 'RND-2' }]);
    await approvePlanPatchPositionPreviews({ organizationId: 'org', sprintId: 1221 });
    expect(dropPosition).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'RND-2' }));
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects without writing a position', async () => {
    remove.mockResolvedValue(1);
    await expect(
      rejectPlanPatchPositionPreviews({ organizationId: 'org', sprintId: 1221, taskId: 'RND-1' })
    ).resolves.toBe(1);
    expect(upsert).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
  });
});

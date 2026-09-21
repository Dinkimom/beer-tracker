import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  confirmAllPendingSprintComments,
  confirmPendingSprintComments,
  deleteAllPendingSprintComments,
  hasSprintComment,
} from '@/lib/sprints/sprintCommentsRepository';

import {
  approveAllPendingSprintComments,
  approvePendingSprintComment,
  rejectAllPendingSprintComments,
} from './sprintCommentApprove';

vi.mock('@/lib/sprints/sprintCommentsRepository', () => ({
  confirmAllPendingSprintComments: vi.fn(),
  confirmPendingSprintComments: vi.fn(),
  deleteAllPendingSprintComments: vi.fn(),
  hasSprintComment: vi.fn(),
}));

const confirmPending = vi.mocked(confirmPendingSprintComments);
const exists = vi.mocked(hasSprintComment);
const confirmAll = vi.mocked(confirmAllPendingSprintComments);
const deleteAll = vi.mocked(deleteAllPendingSprintComments);

describe('approvePendingSprintComment', () => {
  beforeEach(() => {
    confirmPending.mockReset();
    exists.mockReset();
  });

  it('confirms a pending note', async () => {
    confirmPending.mockResolvedValue(1);
    await expect(
      approvePendingSprintComment({ commentId: 'c1', sprintId: 1152 })
    ).resolves.toBe('ok');
    expect(exists).not.toHaveBeenCalled();
  });

  it('treats an already confirmed note as ok', async () => {
    confirmPending.mockResolvedValue(0);
    exists.mockResolvedValue(true);
    await expect(
      approvePendingSprintComment({ commentId: 'c1', sprintId: 1152 })
    ).resolves.toBe('ok');
  });

  it('returns not_found when the comment is missing', async () => {
    confirmPending.mockResolvedValue(0);
    exists.mockResolvedValue(false);
    await expect(
      approvePendingSprintComment({ commentId: 'c1', sprintId: 1152 })
    ).resolves.toBe('not_found');
  });
});

describe('batch pending comments', () => {
  beforeEach(() => {
    confirmAll.mockReset();
    deleteAll.mockReset();
  });

  it('confirms every pending note in the sprint', async () => {
    confirmAll.mockResolvedValue(3);
    await expect(approveAllPendingSprintComments({ sprintId: 1152 })).resolves.toBe(3);
  });

  it('deletes every pending note in the sprint', async () => {
    deleteAll.mockResolvedValue(2);
    await expect(rejectAllPendingSprintComments({ sprintId: 1152 })).resolves.toBe(2);
  });
});

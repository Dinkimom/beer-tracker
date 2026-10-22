import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applyPendingCommentReplacements } from '@/lib/sprints/sprintCommentReplacements';
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

vi.mock('@/lib/sprints/sprintCommentReplacements', () => ({
  applyPendingCommentReplacements: vi.fn(),
}));

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
const applyReplacements = vi.mocked(applyPendingCommentReplacements);

describe('approvePendingSprintComment', () => {
  beforeEach(() => {
    confirmPending.mockReset();
    exists.mockReset();
    applyReplacements.mockReset();
    applyReplacements.mockResolvedValue(0);
  });

  it('applies a replacement draft to the original instead of confirming it', async () => {
    applyReplacements.mockResolvedValue(1);
    await expect(approvePendingSprintComment({ commentId: 'c1', sprintId: 1152 })).resolves.toBe('ok');
    expect(applyReplacements).toHaveBeenCalledWith({ commentIds: ['c1'], sprintId: 1152 });
    expect(confirmPending).not.toHaveBeenCalled();
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
    applyReplacements.mockReset();
  });

  it('applies replacement drafts and confirms every other pending note in the sprint', async () => {
    applyReplacements.mockResolvedValue(1);
    confirmAll.mockResolvedValue(3);
    await expect(approveAllPendingSprintComments({ ownerId: 'user-1', sprintId: 1152 })).resolves.toBe(4);
    expect(applyReplacements).toHaveBeenCalledWith({ ownerId: 'user-1', sprintId: 1152 });
  });

  it('deletes every pending note in the sprint', async () => {
    deleteAll.mockResolvedValue(2);
    await expect(rejectAllPendingSprintComments({ ownerId: 'user-1', sprintId: 1152 })).resolves.toBe(2);
  });
});

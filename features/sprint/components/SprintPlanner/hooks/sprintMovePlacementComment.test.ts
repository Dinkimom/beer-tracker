import type { Comment } from '@/types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { moveCommentToSprintFirstDay, revertCommentMove } from './sprintMovePlacementComment';

const mockMove = vi.fn();
const mockSave = vi.fn();

vi.mock('@/lib/beerTrackerApi', () => ({
  moveSprintComments: (...args: unknown[]) => mockMove(...args),
  saveComment: (...args: unknown[]) => mockSave(...args),
}));

const comment: Comment = {
  assigneeId: 'dev-1',
  day: 4,
  height: 2,
  id: 'note-1',
  part: 1,
  text: 'Note @dev',
  width: 3,
  x: 12,
  y: 1,
};

describe('sprintMovePlacementComment', () => {
  beforeEach(() => {
    mockMove.mockReset().mockResolvedValue(true);
    mockSave.mockReset().mockResolvedValue(true);
  });

  it('переносит заметку и ставит в первый день той же дорожки', async () => {
    await expect(
      moveCommentToSprintFirstDay({ comment, fromSprintId: 1, toSprintId: 2 })
    ).resolves.toBe(true);
    expect(mockMove).toHaveBeenCalledWith(1, 2, ['note-1']);
    expect(mockSave).toHaveBeenCalledWith(
      2,
      expect.objectContaining({
        assigneeId: 'dev-1',
        day: 0,
        part: 0,
        skipMentionNotifications: true,
        x: 0,
        y: 1,
      }),
      true
    );
  });

  it('не трогает место, если перенос не удался', async () => {
    mockMove.mockResolvedValue(false);
    await expect(
      moveCommentToSprintFirstDay({ comment, fromSprintId: 1, toSprintId: 2 })
    ).resolves.toBe(false);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('отмена возвращает заметку на прежнее место', async () => {
    await expect(revertCommentMove({ comment, fromSprintId: 1, toSprintId: 2 })).resolves.toBe(true);
    expect(mockMove).toHaveBeenCalledWith(2, 1, ['note-1']);
    expect(mockSave).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ day: 4, part: 1, x: 12, y: 1 }),
      true
    );
  });
});

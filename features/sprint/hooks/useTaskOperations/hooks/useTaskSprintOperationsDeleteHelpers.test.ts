import type { TaskLink } from '@/types';

import { describe, expect, it, vi } from 'vitest';

import { deleteLinksAfterMove } from './useTaskSprintOperationsDeleteHelpers';

const NOTE = 'comment:6f1c2a5e-8b1d-4c3e-9f0a-1b2c3d4e5f60';

function link(id: string, fromTaskId: string, toTaskId: string): TaskLink {
  return { fromTaskId, id, toTaskId };
}

describe('deleteLinksAfterMove', () => {
  it('deletes only planner links (with a note) and leaves tracker task↔task links alone', async () => {
    const deleteLink = vi.fn<(id: string) => Promise<void>>(() => Promise.resolve());
    await deleteLinksAfterMove(
      [link('tracker', 'A-1', 'A-2'), link('note-in', NOTE, 'A-1'), link('note-out', 'A-1', NOTE)],
      deleteLink
    );
    expect(deleteLink.mock.calls.map(([id]) => id)).toEqual(['note-in', 'note-out']);
  });

  it('keeps going when one delete fails', async () => {
    const deleteLink = vi
      .fn<(id: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue(undefined);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await deleteLinksAfterMove([link('a', NOTE, 'A-1'), link('b', NOTE, 'A-2')], deleteLink);
    expect(deleteLink).toHaveBeenCalledTimes(2);
  });
});

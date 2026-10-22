import type { Comment } from '@/types';

import { describe, expect, it } from 'vitest';

import { approveCommentDraftsLocally } from './approveCommentDrafts';

function note(overrides: Partial<Comment>): Comment {
  return { assigneeId: 'u-1', day: 1, height: 2, id: 'n-1', part: 0, text: 'Груминг', width: 4, x: 0, y: 0, ...overrides };
}

describe('approveCommentDraftsLocally', () => {
  it('turns a created draft into a regular note', () => {
    const draft = note({ id: 'd-1', pendingApproval: true });
    expect(approveCommentDraftsLocally([draft], new Set(['d-1']))).toEqual([{ ...draft, pendingApproval: undefined }]);
  });

  it('moves an update draft into the original and drops the copy', () => {
    const original = note({ color: 'yellow' });
    const draft = note({
      color: 'green',
      id: 'd-1',
      pendingApproval: true,
      replaceAction: 'update',
      replacesCommentId: 'n-1',
      text: '- [ ] Груминг',
    });
    const other = note({ id: 'n-2' });
    expect(approveCommentDraftsLocally([original, draft, other], new Set(['d-1']))).toEqual([
      { ...original, color: 'green', text: '- [ ] Груминг' },
      other,
    ]);
  });

  it('removes the original for a delete draft and leaves undecided drafts alone', () => {
    const original = note({});
    const draft = note({ id: 'd-1', pendingApproval: true, replaceAction: 'delete', replacesCommentId: 'n-1' });
    const pending = note({ id: 'd-2', pendingApproval: true });
    expect(approveCommentDraftsLocally([original, draft, pending], new Set(['d-1']))).toEqual([pending]);
  });
});

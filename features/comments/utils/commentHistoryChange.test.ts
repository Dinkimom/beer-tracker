import type { Comment } from '@/types';

import { describe, expect, it } from 'vitest';

import { applyCommentChangeWithHistory } from './commentHistoryChange';

const note: Comment = {
  assigneeId: 'dev-1',
  day: 1,
  height: 2,
  id: 'c1',
  part: 0,
  text: 'note',
  width: 3,
  x: 0,
  y: 0,
};

describe('applyCommentChangeWithHistory', () => {
  it('records an undo step for a move', () => {
    const { comments, history } = applyCommentChangeWithHistory([note], 'c1', (c) => ({
      ...c,
      assigneeId: 'dev-2',
      day: 4,
    }));
    expect(comments[0]).toMatchObject({ assigneeId: 'dev-2', day: 4 });
    expect(history?.before).toMatchObject({ assigneeId: 'dev-1', day: 1 });
    expect(history?.after).toMatchObject({ assigneeId: 'dev-2', day: 4 });
  });

  it('records an undo step for a parent change and a resize', () => {
    const parent = { display: 'Story', id: '1', key: 'ST-1' };
    expect(applyCommentChangeWithHistory([note], 'c1', (c) => ({ ...c, parent })).history).not.toBeNull();
    expect(applyCommentChangeWithHistory([note], 'c1', (c) => ({ ...c, width: 5 })).history).not.toBeNull();
  });

  it('does not record text or colour edits', () => {
    expect(
      applyCommentChangeWithHistory([note], 'c1', (c) => ({ ...c, color: 'pink', text: 'edited' })).history
    ).toBeNull();
  });

  it('does not record a no-op and keeps the same list for an unknown note', () => {
    expect(applyCommentChangeWithHistory([note], 'c1', (c) => ({ ...c })).history).toBeNull();
    const list = [note];
    const missing = applyCommentChangeWithHistory(list, 'nope', (c) => ({ ...c, day: 9 }));
    expect(missing.comments).toBe(list);
    expect(missing.history).toBeNull();
  });
});

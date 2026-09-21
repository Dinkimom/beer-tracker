import { describe, expect, it } from 'vitest';

import { applyPendingDeletesToRemote, mergeRemoteItemsWithPending } from './mergeRemoteItemsWithPending';

describe('mergeRemoteItemsWithPending', () => {
  it('returns remote snapshot when there are no pending edits', () => {
    const remote = [
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
    ];
    expect(mergeRemoteItemsWithPending(remote, new Map(), (row) => row.id)).toEqual(remote);
  });

  it('keeps pending items over the remote version of the same id', () => {
    const remote = [
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
    ];
    const pending = new Map([['a', { id: 'a', v: 9 }]]);
    expect(mergeRemoteItemsWithPending(remote, pending, (row) => row.id)).toEqual([
      { id: 'b', v: 2 },
      { id: 'a', v: 9 },
    ]);
  });

  it('lets a custom merger copy remote fields onto a pending item', () => {
    const remote = [{ id: 'a', reactions: ['👍'], text: 'server' }];
    const pending = new Map([['a', { id: 'a', reactions: [], text: 'local' }]]);
    expect(
      mergeRemoteItemsWithPending(remote, pending, (row) => row.id, (local, fromServer) => ({
        ...local,
        reactions: fromServer.reactions,
      }))
    ).toEqual([{ id: 'a', reactions: ['👍'], text: 'local' }]);
  });
});

describe('applyPendingDeletesToRemote', () => {
  it('keeps suppressing a deleted id while the snapshot still contains it', () => {
    const remote = [
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
    ];
    expect(applyPendingDeletesToRemote(remote, new Set(['a']), (row) => row.id)).toEqual({
      items: [{ id: 'b', v: 2 }],
      pendingDeletes: new Set(['a']),
    });
  });

  it('drops a pending delete once the snapshot no longer contains the id', () => {
    const remote = [{ id: 'b', v: 2 }];
    expect(applyPendingDeletesToRemote(remote, new Set(['a']), (row) => row.id)).toEqual({
      items: remote,
      pendingDeletes: new Set(),
    });
  });
});

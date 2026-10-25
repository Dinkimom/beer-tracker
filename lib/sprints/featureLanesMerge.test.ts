import type { FeatureLanesDocument } from './featureLanesDocument';

import { describe, expect, it } from 'vitest';

import { mergeFeatureLanesDocuments } from './featureLanesMerge';

function doc(partial: Partial<FeatureLanesDocument>): FeatureLanesDocument {
  return { draftRows: [], hiddenIds: [], orderIds: [], ...partial };
}

const rowA = { id: 'draft:a', name: 'A' };
const rowB = { id: 'draft:b', name: 'B' };
const moved = { id: 'draft:moved', issueKeys: ['BT-1'], name: 'Moved' };

describe('mergeFeatureLanesDocuments', () => {
  it('keeps a row moved in from another sprint while a stale tab saves its own edit', () => {
    const base = doc({ draftRows: [rowA], orderIds: ['draft:a'] });
    const local = doc({ draftRows: [{ ...rowA, name: 'A renamed' }], orderIds: ['draft:a'] });
    const remote = doc({ draftRows: [rowA, moved], orderIds: ['draft:a', 'draft:moved'] });
    expect(mergeFeatureLanesDocuments(base, local, remote)).toEqual({
      draftRows: [{ ...rowA, name: 'A renamed' }, moved],
      hiddenIds: [],
      orderIds: ['draft:a', 'draft:moved'],
    });
  });

  it('applies a local delete and does not bring the row back', () => {
    const base = doc({ draftRows: [rowA, rowB], orderIds: ['draft:a', 'draft:b'] });
    const local = doc({ draftRows: [rowA], orderIds: ['draft:a'] });
    const remote = doc({ draftRows: [rowA, { ...rowB, name: 'B edited remotely' }], orderIds: ['draft:a', 'draft:b'] });
    expect(mergeFeatureLanesDocuments(base, local, remote)).toEqual(
      doc({ draftRows: [rowA], orderIds: ['draft:a'] })
    );
  });

  it('respects a remote delete unless the tab edited that row', () => {
    const base = doc({ draftRows: [rowA, rowB], hiddenIds: ['x'] });
    const local = doc({ draftRows: [rowA, { ...rowB, name: 'B kept' }], hiddenIds: ['x'] });
    const remote = doc({ draftRows: [], hiddenIds: [] });
    expect(mergeFeatureLanesDocuments(base, local, remote)).toEqual(
      doc({ draftRows: [{ ...rowB, name: 'B kept' }], hiddenIds: [] })
    );
  });

  it('keeps the local order and appends ids added remotely', () => {
    const base = doc({ orderIds: ['a', 'b'] });
    const local = doc({ orderIds: ['b', 'a', 'c'] });
    const remote = doc({ orderIds: ['a', 'b', 'd'] });
    expect(mergeFeatureLanesDocuments(base, local, remote).orderIds).toEqual(['b', 'a', 'c', 'd']);
  });
});

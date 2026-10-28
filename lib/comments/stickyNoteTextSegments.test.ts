import { describe, expect, it } from 'vitest';

import { mergeAdjacentTextSegments } from './stickyNoteTextSegments';

type Segment = { key: string; type: 'issueKey' } | { type: 'text'; value: string };

describe('mergeAdjacentTextSegments', () => {
  it('returns an empty list as is', () => {
    expect(mergeAdjacentTextSegments<Segment>([])).toEqual([]);
  });

  it('merges consecutive text segments and keeps the others in place', () => {
    const segments: Segment[] = [
      { type: 'text', value: 'a' },
      { type: 'text', value: 'b' },
      { key: 'BT-1', type: 'issueKey' },
      { type: 'text', value: 'c' },
      { type: 'text', value: 'd' },
      { type: 'text', value: 'e' },
    ];
    expect(mergeAdjacentTextSegments(segments)).toEqual([
      { type: 'text', value: 'ab' },
      { key: 'BT-1', type: 'issueKey' },
      { type: 'text', value: 'cde' },
    ]);
  });

  it('does not merge non-text neighbours', () => {
    const segments: Segment[] = [
      { key: 'BT-1', type: 'issueKey' },
      { key: 'BT-2', type: 'issueKey' },
    ];
    expect(mergeAdjacentTextSegments(segments)).toEqual(segments);
  });
});

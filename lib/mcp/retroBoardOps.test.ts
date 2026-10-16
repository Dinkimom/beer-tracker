import { describe, expect, it } from 'vitest';

import { parseRetroBoardOps } from './retroBoardOps';

describe('parseRetroBoardOps', () => {
  it('accepts addNote with columnPreset', () => {
    const ops = parseRetroBoardOps([
      { columnPreset: 'glad', op: 'addNote', text: 'Ship smaller slices' },
    ]);
    expect(ops).toHaveLength(1);
    expect(ops[0]?.op).toBe('addNote');
  });

  it('rejects addNote without column target', () => {
    expect(() =>
      parseRetroBoardOps([{ op: 'addNote', text: 'Missing column' }])
    ).toThrow(/columnId or columnPreset/);
  });
});

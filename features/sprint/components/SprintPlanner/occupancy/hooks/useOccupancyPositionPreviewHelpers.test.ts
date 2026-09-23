import { describe, expect, it } from 'vitest';

import { applyOccupancyPositionPreviewUpdate } from './useOccupancyPositionPreviewHelpers';

const resized = { duration: 8, startDay: 1, startPart: 0 };

describe('applyOccupancyPositionPreviewUpdate', () => {
  it('keeps the last preview when the gesture ends without discard', () => {
    const prev = new Map([['BT-1', resized]]);
    expect(applyOccupancyPositionPreviewUpdate(prev, 'BT-1', null)).toBe(prev);
  });

  it('drops the preview on Escape so the bar returns to the saved position', () => {
    const prev = new Map([['BT-1', resized]]);
    const next = applyOccupancyPositionPreviewUpdate(prev, 'BT-1', null, { discard: true });
    expect(next.has('BT-1')).toBe(false);
    expect(prev.has('BT-1')).toBe(true);
  });
});

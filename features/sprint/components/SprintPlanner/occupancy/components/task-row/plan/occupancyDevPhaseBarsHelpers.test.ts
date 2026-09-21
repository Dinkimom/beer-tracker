import { describe, expect, it } from 'vitest';

import {
  applyOccupancyBarPositionPreview,
  quarterlyDevPhaseDurationLabel,
  ruDaysInflection,
  sortPhaseSegmentsByTimeline,
} from './occupancyDevPhaseBarsHelpers';

describe('ruDaysInflection', () => {
  it('handles 1, 2-4, 5+ and teens', () => {
    expect(ruDaysInflection(1)).toBe('день');
    expect(ruDaysInflection(21)).toBe('день');
    expect(ruDaysInflection(2)).toBe('дня');
    expect(ruDaysInflection(11)).toBe('дней');
    expect(ruDaysInflection(5)).toBe('дней');
  });
});

describe('quarterlyDevPhaseDurationLabel', () => {
  it('returns undefined when not quarterly style', () => {
    expect(quarterlyDevPhaseDurationLabel(false, 9)).toBeUndefined();
  });

  it('builds label from parts (PARTS_PER_DAY parts = 1 day)', () => {
    expect(quarterlyDevPhaseDurationLabel(true, 3)).toMatch(/^Разработка - 1 день$/);
    expect(quarterlyDevPhaseDurationLabel(true, 9)).toMatch(/^Разработка - 3 дня$/);
  });
});

describe('applyOccupancyBarPositionPreview', () => {
  const position = { assignee: 'dev-1', duration: 3, startDay: 0, startPart: 0, taskId: 'BT-1' };

  it('returns the saved position when there is no preview', () => {
    expect(applyOccupancyBarPositionPreview(position, undefined)).toBe(position);
  });

  it('overlays start and duration from the live preview', () => {
    expect(
      applyOccupancyBarPositionPreview(position, { duration: 6, startDay: 2, startPart: 1 })
    ).toEqual({
      ...position,
      duration: 6,
      startDay: 2,
      startPart: 1,
    });
  });
});

describe('sortPhaseSegmentsByTimeline', () => {
  it('orders by start day then part', () => {
    const sorted = sortPhaseSegmentsByTimeline([
      { duration: 3, startDay: 2, startPart: 0 },
      { duration: 1, startDay: 0, startPart: 0 },
      { duration: 1, startDay: 1, startPart: 2 },
    ]);
    expect(sorted.map((s) => s.startDay)).toEqual([0, 1, 2]);
  });
});

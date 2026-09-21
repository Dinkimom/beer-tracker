import { describe, expect, it } from 'vitest';

import {
  parseSwimlaneBaselineLayoutMode,
  resolveSwimlaneBaselinesForLayerPacking,
} from './swimlaneBaselineLayoutMode';

describe('parseSwimlaneBaselineLayoutMode', () => {
  it('maps the stored mode and the legacy overdue toggle', () => {
    expect(parseSwimlaneBaselineLayoutMode('compact')).toBe('compact');
    expect(parseSwimlaneBaselineLayoutMode('noOverlap')).toBe('noOverlap');
    expect(parseSwimlaneBaselineLayoutMode(false)).toBe('compact');
    expect(parseSwimlaneBaselineLayoutMode(true)).toBe('noOverlap');
    expect(parseSwimlaneBaselineLayoutMode(undefined)).toBe('noOverlap');
  });
});

describe('resolveSwimlaneBaselinesForLayerPacking', () => {
  const baselines = [{ taskId: 'a' }, { taskId: 'b' }];

  it('packs baselines only in no-overlap mode', () => {
    expect(resolveSwimlaneBaselinesForLayerPacking(baselines, 'noOverlap')).toBe(baselines);
    expect(resolveSwimlaneBaselinesForLayerPacking(baselines, 'compact')).toEqual([]);
  });
});

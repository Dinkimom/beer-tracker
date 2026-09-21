import { describe, expect, it } from 'vitest';

import { QUARTERLY_STATUS_COLUMN_MIN_WIDTH_PX } from '../components/planner/quarterlyPlannerLayout';

import {
  QUARTERLY_STATUS_CELL_HORIZONTAL_PADDING_PX,
  resolveQuarterlyStatusColumnWidth,
  tasksForQuarterlyStatusColumnMeasure,
} from './quarterlyStatusColumnWidth';

describe('tasksForQuarterlyStatusColumnMeasure', () => {
  it('dedupes by status and skips tasks without originalStatus', () => {
    const tasks = [
      { id: 'A-1', name: 'a', link: '#', team: 'Back' as const, originalStatus: 'open' },
      { id: 'A-2', name: 'b', link: '#', team: 'Back' as const, originalStatus: 'open' },
      { id: 'A-3', name: 'c', link: '#', team: 'Back' as const },
      { id: 'A-4', name: 'd', link: '#', team: 'Back' as const, originalStatus: 'closed' },
    ];
    expect(tasksForQuarterlyStatusColumnMeasure(tasks)).toHaveLength(2);
  });
});

describe('resolveQuarterlyStatusColumnWidth', () => {
  it('adds cell padding and respects minimum', () => {
    expect(resolveQuarterlyStatusColumnWidth(0)).toBe(QUARTERLY_STATUS_COLUMN_MIN_WIDTH_PX);
    expect(resolveQuarterlyStatusColumnWidth(100)).toBe(
      100 + QUARTERLY_STATUS_CELL_HORIZONTAL_PADDING_PX
    );
  });
});

import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { buildQuarterlyFlatRows } from './buildQuarterlyFlatRows';

function task(id: string): Task {
  return {
    id,
    name: id,
    link: '#',
    team: 'Back',
  };
}

describe('buildQuarterlyFlatRows', () => {
  it('returns flat task rows without parent groups', () => {
    const rows = buildQuarterlyFlatRows([task('B-2'), task('A-1')]);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.type === 'task')).toBe(true);
    expect(rows.map((r) => (r.type === 'task' ? r.task.id : ''))).toEqual(['A-1', 'B-2']);
  });
});

import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { filterSlaBugTasks } from './filterSlaBugTasks';

function bug(id: string, incidentSeverity?: string): Task {
  return {
    id,
    name: id,
    link: `https://tracker.yandex.ru/${id}`,
    team: 'Back',
    type: 'bug',
    incidentSeverity,
  };
}

describe('filterSlaBugTasks', () => {
  it('keeps SLA bugs and counts exclusions', () => {
    const result = filterSlaBugTasks([
      bug('B-1', 'P1'),
      bug('B-2'),
      bug('B-3', 'P4'),
      { ...bug('B-4', 'P2'), type: 'task' },
    ]);
    expect(result.tasks.map((t) => t.id)).toEqual(['B-1', 'B-3']);
    expect(result.stats).toEqual({
      included: 2,
      excludedNoSeverity: 1,
      excludedNotBug: 1,
    });
  });
});

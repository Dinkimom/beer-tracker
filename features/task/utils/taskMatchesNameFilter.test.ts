import { describe, expect, it } from 'vitest';

import { taskMatchesNameFilter } from './taskMatchesNameFilter';

const task = { assigneeName: 'Ken Thompson', id: 'DEMO-109', name: 'Payments webhook' };

describe('taskMatchesNameFilter', () => {
  it('matches the name, key or assignee, ignoring case and spaces around', () => {
    expect(taskMatchesNameFilter(task, ' webhook ')).toBe(true);
    expect(taskMatchesNameFilter(task, 'demo-109')).toBe(true);
    expect(taskMatchesNameFilter(task, 'ken')).toBe(true);
    expect(taskMatchesNameFilter(task, 'refund')).toBe(false);
  });

  it('matches everything without a search', () => {
    expect(taskMatchesNameFilter(task, '')).toBe(true);
    expect(taskMatchesNameFilter(task, undefined)).toBe(true);
  });
});

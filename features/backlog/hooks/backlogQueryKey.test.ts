import { describe, expect, it } from 'vitest';

import { backlogQueryKey } from '@/features/backlog/hooks/useBacklog';

describe('backlogQueryKey', () => {
  it('includes demo segment for demo planner scope', () => {
    expect(backlogQueryKey(2, 1, true)).toEqual(['backlog', 'demo', 2, 1]);
  });

  it('omits demo segment for main planner', () => {
    expect(backlogQueryKey(2, 1, false)).toEqual(['backlog', 2, 1]);
  });
});

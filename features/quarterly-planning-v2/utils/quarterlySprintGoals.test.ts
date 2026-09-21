import { describe, expect, it } from 'vitest';

import { mergeSprintGoalsResponses } from './quarterlySprintGoals';

describe('mergeSprintGoalsResponses', () => {
  it('merges delivery and discovery items', () => {
    const merged = mergeSprintGoalsResponses(
      {
        checklistDone: 1,
        checklistTotal: 2,
        checklistItems: [
          { id: '1', text: 'A', checked: true, checklistItemType: 'standard' },
          { id: '2', text: 'B', checked: false, checklistItemType: 'standard' },
        ],
      },
      {
        checklistDone: 1,
        checklistTotal: 1,
        checklistItems: [
          { id: '3', text: 'C', checked: true, checklistItemType: 'standard' },
        ],
      }
    );
    expect(merged.checklistTotal).toBe(3);
    expect(merged.checklistDone).toBe(2);
    expect(merged.checklistItems).toHaveLength(3);
  });
});

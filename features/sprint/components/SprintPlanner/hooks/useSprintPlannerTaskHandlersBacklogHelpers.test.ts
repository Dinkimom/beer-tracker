import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { buildBacklogDropPosition } from './useSprintPlannerTaskHandlersBacklogHelpers';

function backlogTask(storyPoints: number): Task {
  return { id: 'BL-1', link: '', name: 'Backlog', team: 'Web', storyPoints };
}

describe('buildBacklogDropPosition', () => {
  it('keeps the dropped cell when the card fits', () => {
    expect(buildBacklogDropPosition('BL-1', 'dev', 1, 1, backlogTask(3), 30)).toMatchObject({
      assignee: 'dev',
      duration: 3,
      plannedDuration: 3,
      plannedStartDay: 1,
      plannedStartPart: 1,
      startDay: 1,
      startPart: 1,
    });
  });

  it('shifts the start left so the SP duration ends with the sprint', () => {
    // SP 5 → 5 slots; drop at day 9 part 2 (cell 29) → start 25
    const position = buildBacklogDropPosition('BL-1', 'dev', 9, 2, backlogTask(5), 30);
    expect(position).toMatchObject({ duration: 5, startDay: 8, startPart: 1 });
  });

  it('uses the real sprint length', () => {
    const position = buildBacklogDropPosition('BL-1', 'dev', 9, 2, backlogTask(5), 45);
    expect(position).toMatchObject({ startDay: 9, startPart: 2 });
  });
});

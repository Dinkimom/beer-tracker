import type { Task, TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  applyRemotePresenceCardRowPreviews,
  computeSwimlanePointTotals,
} from './useSwimlaneLayoutHelpers';

describe('computeSwimlanePointTotals (standalone QA)', () => {
  it('counts story points for standalone QA tasks and flags hideTestPoints', () => {
    const positionedTasks: Array<{ task: Task; position: TaskPosition }> = [
      {
        position: {
          assignee: 'qa-1',
          duration: 3,
          startDay: 0,
          startPart: 0,
          taskId: 'QA-1',
        },
        task: {
          hideTestPointsByIntegration: true,
          id: 'QA-1',
          link: '',
          name: 'Test task',
          storyPoints: 4,
          team: 'QA',
        },
      },
    ];

    expect(computeSwimlanePointTotals(positionedTasks)).toEqual({
      completedSP: 0,
      completedTP: 0,
      hasVolumeTasks: true,
      hideTestPoints: true,
      totalSP: 4,
      totalTP: 0,
    });
  });
});

describe('applyRemotePresenceCardRowPreviews', () => {
  it('overlays a foreign height without replacing the local busy card', () => {
    const next = applyRemotePresenceCardRowPreviews(
      new Map([['note-1', { layerShiftUp: 0, span: 1 }]]),
      new Map([
        ['note-1', { layerShiftUp: 1, span: 3 }],
        ['note-2', { layerShiftUp: 0, span: 4 }],
      ]),
      'note-1'
    );
    expect(next.get('note-1')).toEqual({ layerShiftUp: 0, span: 1 });
    expect(next.get('note-2')).toEqual({ layerShiftUp: 0, span: 4 });
  });
});

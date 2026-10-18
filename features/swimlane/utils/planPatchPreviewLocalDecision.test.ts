import type { PlanPatchPositionPreview } from '@/lib/sprints/sprintPlanPatchPositionPreview';
import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import {
  acceptPlanPatchPreviewsLocally,
  restorePlanPatchPreviewsLocally,
} from './planPatchPreviewLocalDecision';

function preview(patch: Partial<PlanPatchPositionPreview>): PlanPatchPositionPreview {
  return {
    assigneeId: 'dev-1',
    changes: [],
    duration: 2,
    remove: false,
    startDay: 1,
    startPart: 0,
    taskId: 'RND-1',
    ...patch,
  };
}

describe('planPatchPreviewLocalDecision', () => {
  it('moves a card and restores it when the request fails', () => {
    const current: TaskPosition = {
      assignee: 'dev-1',
      duration: 2,
      startDay: 0,
      startPart: 0,
      taskId: 'RND-1',
    };
    const positions = new Map<string, TaskPosition>([['RND-1', current]]);
    const previews = new Map<string, PlanPatchPositionPreview>([
      ['RND-1', preview({ changes: ['schedule'], startDay: 4 })],
    ]);
    const snapshot = acceptPlanPatchPreviewsLocally(positions, previews, [...previews.values()]);
    expect(positions.get('RND-1')?.startDay).toBe(4);
    expect(previews.size).toBe(0);
    restorePlanPatchPreviewsLocally(positions, previews, snapshot);
    expect(positions.get('RND-1')).toEqual(current);
    expect(previews.get('RND-1')?.startDay).toBe(4);
  });

  it('drops a removal and puts the original back', () => {
    const current: TaskPosition = {
      assignee: 'dev-1',
      duration: 2,
      startDay: 2,
      startPart: 0,
      taskId: 'RND-2',
    };
    const positions = new Map([['RND-2', current]]);
    const previews = new Map([['RND-2', preview({ remove: true, taskId: 'RND-2' })]]);
    const snapshot = acceptPlanPatchPreviewsLocally(positions, previews, [...previews.values()]);
    expect(positions.has('RND-2')).toBe(false);
    restorePlanPatchPreviewsLocally(positions, previews, snapshot);
    expect(positions.get('RND-2')).toEqual(current);
  });
});

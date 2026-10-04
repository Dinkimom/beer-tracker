import type { TransitionItem } from '@/lib/api/types';
import type { TaskPosition } from '@/types';

import { describe, expect, it } from 'vitest';

import { buildNextPlanPosition, pickDoneTransition } from './closeOverdueAndCreateNext';

function transition(partial: Partial<TransitionItem> & Pick<TransitionItem, 'id'>): TransitionItem {
  return partial;
}

function position(): TaskPosition {
  return { assignee: 'dev-1', duration: 6, startDay: 0, startPart: 0, taskId: 'OLD-1' };
}

describe('pickDoneTransition', () => {
  it('prefers a done transition that does not ask for a screen', () => {
    const picked = pickDoneTransition([
      transition({ id: 'screen', screen: { id: '1' }, to: { key: 'done', statusTypeKey: 'done' } }),
      transition({ id: 'plain', to: { key: 'closed', statusTypeKey: 'done' } }),
    ]);
    expect(picked?.id).toBe('plain');
  });

  it('falls back to a screened done transition', () => {
    const picked = pickDoneTransition([
      transition({ id: 'progress', to: { key: 'inProgress', statusTypeKey: 'indeterminate' } }),
      transition({ id: 'screen', screen: { id: '9' }, to: { key: 'готово' } }),
    ]);
    expect(picked?.id).toBe('screen');
  });

  it('returns null when nothing closes the task', () => {
    expect(pickDoneTransition([transition({ id: 'start', to: { key: 'inProgress' } })])).toBeNull();
  });
});

describe('buildNextPlanPosition', () => {
  it('starts the new plan at the current cell for one day', () => {
    expect(buildNextPlanPosition(position(), 8, 3, 30, 'NEW-1')).toEqual({
      assignee: 'dev-1',
      duration: 3,
      startDay: 2,
      startPart: 2,
      taskId: 'NEW-1',
    });
  });

  it('clips the day when the sprint ends sooner', () => {
    expect(buildNextPlanPosition(position(), 29, 3, 30, 'NEW-1')?.duration).toBe(1);
  });

  it('returns null after the timeline', () => {
    expect(buildNextPlanPosition(position(), 30, 3, 30, 'NEW-1')).toBeNull();
  });
});

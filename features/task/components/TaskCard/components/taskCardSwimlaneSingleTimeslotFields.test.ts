import type { SwimlaneCardFieldsVisibility } from '@/hooks/useLocalStorage';
import type { Task } from '@/types';

import { describe, expect, it } from 'vitest';

import { isSwimlaneSingleTimeslotWidth } from '../taskCardLayoutHelpers';

import { shouldShowTaskCardSwimlaneMetaRow } from './taskCardBodyHelpers';
import { shouldShowTaskCardParentRow } from './taskCardBodyLayoutHelpers';
import {
  mergeSwimlaneCardFields,
  resolveTaskCardSwimlaneMetaVisibility,
} from './taskCardContentHelpers';

function task(partial: Partial<Task> & Pick<Task, 'id' | 'name'>): Task {
  return {
    link: '#',
    status: 'todo',
    team: 'Back',
    ...partial,
  };
}

const visibleFields: SwimlaneCardFieldsVisibility = mergeSwimlaneCardFields(undefined);

const trackerTask = task({
  id: 'T-1',
  name: 'Task',
  parent: { display: 'Story One', id: '1', key: 'ST-1' },
  priority: 'critical',
  type: 'bug',
});

describe('isSwimlaneSingleTimeslotWidth', () => {
  it('treats one timeslot as compact width', () => {
    expect(isSwimlaneSingleTimeslotWidth(1)).toBe(true);
    expect(isSwimlaneSingleTimeslotWidth(0)).toBe(true);
  });

  it('keeps two or more timeslots as regular width', () => {
    expect(isSwimlaneSingleTimeslotWidth(2)).toBe(false);
    expect(isSwimlaneSingleTimeslotWidth(undefined)).toBe(false);
  });
});

describe('shouldShowTaskCardParentRow', () => {
  it('shows parent on wider swimlane cards when the field is enabled', () => {
    expect(
      shouldShowTaskCardParentRow({
        displayDuration: 2,
        swimlaneCardFields: visibleFields,
        task: trackerTask,
        variant: 'swimlane',
      })
    ).toBe(true);
  });

  it('hides parent when the card is one timeslot wide', () => {
    expect(
      shouldShowTaskCardParentRow({
        displayDuration: 1,
        swimlaneCardFields: visibleFields,
        task: trackerTask,
        variant: 'swimlane',
      })
    ).toBe(false);
  });

  it('hides parent when the feature-lane row already represents the parent', () => {
    expect(
      shouldShowTaskCardParentRow({
        displayDuration: 2,
        hideParent: true,
        swimlaneCardFields: visibleFields,
        task: trackerTask,
        variant: 'swimlane',
      })
    ).toBe(false);
  });
});

describe('resolveTaskCardSwimlaneMetaVisibility', () => {
  it('shows type and priority on wider swimlane cards', () => {
    expect(
      resolveTaskCardSwimlaneMetaVisibility({
        displayDuration: 2,
        mergedFields: visibleFields,
        task: trackerTask,
      })
    ).toEqual({
      showKey: true,
      showMetaIcons: true,
      showPriorityIcon: true,
      showTypeIcon: true,
    });
  });

  it('hides type and priority when the card is one timeslot wide, but keeps the key', () => {
    expect(
      resolveTaskCardSwimlaneMetaVisibility({
        displayDuration: 1,
        mergedFields: visibleFields,
        task: trackerTask,
      })
    ).toEqual({
      showKey: true,
      showMetaIcons: false,
      showPriorityIcon: false,
      showTypeIcon: false,
    });
  });

  it('hides tracker meta on diagram cards', () => {
    expect(
      resolveTaskCardSwimlaneMetaVisibility({
        displayDuration: 2,
        mergedFields: visibleFields,
        task: task({ id: 'comment:d1', localDraftKind: 'diagram', name: '' }),
      })
    ).toEqual({
      showKey: false,
      showMetaIcons: false,
      showPriorityIcon: false,
      showTypeIcon: false,
    });
  });
});

describe('shouldShowTaskCardSwimlaneMetaRow', () => {
  it('hides estimates on diagram cards', () => {
    expect(
      shouldShowTaskCardSwimlaneMetaRow({
        isVeryNarrow: false,
        swimlaneCardFields: visibleFields,
        task: task({ id: 'comment:d1', localDraftKind: 'diagram', name: '', storyPoints: 0 }),
        variant: 'swimlane',
      })
    ).toBe(false);
  });

  it('hides status and estimates on the chooser draft so the plus stays', () => {
    expect(
      shouldShowTaskCardSwimlaneMetaRow({
        isVeryNarrow: false,
        swimlaneCardFields: visibleFields,
        task: task({ id: 'local-task-1', isLocalTask: true, name: '' }),
        variant: 'swimlane',
      })
    ).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import {
  isFeatureLaneSyntheticRowId,
  resolveTaskCardSwimlaneAssigneeAvatarPlacement,
  shouldShowTaskCardParentRow,
  shouldShowTaskCardSwimlaneAssigneeAvatar,
} from './taskCardBodyLayoutHelpers';

describe('isFeatureLaneSyntheticRowId', () => {
  it('recognizes team, no-parent and draft row ids', () => {
    expect(isFeatureLaneSyntheticRowId('__team__')).toBe(true);
    expect(isFeatureLaneSyntheticRowId('__task_group_no_parent__')).toBe(true);
    expect(isFeatureLaneSyntheticRowId('feature-draft:abc')).toBe(true);
    expect(isFeatureLaneSyntheticRowId('Feature-draft:abc')).toBe(true);
    expect(isFeatureLaneSyntheticRowId('dev-1')).toBe(false);
  });
});

describe('shouldShowTaskCardParentRow', () => {
  it('shows parent on a note card the same way as on a task', () => {
    expect(
      shouldShowTaskCardParentRow({
        displayDuration: 3,
        swimlaneCardFields: {
          showEstimates: true,
          showKey: true,
          showParent: true,
          showPriority: true,
          showSeverity: true,
          showStatus: true,
          showType: true,
        },
        task: {
          assignee: 'dev-1',
          id: 'comment:c1',
          link: '',
          localDraftKind: 'comment',
          name: 'note',
          parent: { display: 'Story title', id: 's1', key: 'BT-10' },
          status: 'todo',
          storyPoints: 0,
          team: 'Back',
        },
        variant: 'swimlane',
      })
    ).toBe(true);
  });
});

describe('shouldShowTaskCardSwimlaneAssigneeAvatar', () => {
  it('показывает аватар в режиме фич, если исполнитель задан', () => {
    expect(
      shouldShowTaskCardSwimlaneAssigneeAvatar({
        hasAssignee: true,
        showAssigneeAvatar: true,
        task: {},
        variant: 'swimlane',
      })
    ).toBe(true);
  });

  it('показывает аватар на заметке в режиме фич, в том числе без родителя', () => {
    expect(
      shouldShowTaskCardSwimlaneAssigneeAvatar({
        hasAssignee: true,
        showAssigneeAvatar: true,
        task: { assignee: 'dev-1', localDraftKind: 'comment' },
        variant: 'swimlane',
      })
    ).toBe(true);
  });

  it('скрывает аватар на заметке в «Общем» и «Без родителя»', () => {
    expect(
      shouldShowTaskCardSwimlaneAssigneeAvatar({
        hasAssignee: true,
        showAssigneeAvatar: true,
        task: { assignee: '__team__', localDraftKind: 'comment' },
        variant: 'swimlane',
      })
    ).toBe(false);
    expect(
      shouldShowTaskCardSwimlaneAssigneeAvatar({
        hasAssignee: true,
        showAssigneeAvatar: true,
        task: { assignee: '__task_group_no_parent__', localDraftKind: 'comment' },
        variant: 'swimlane',
      })
    ).toBe(false);
    expect(
      shouldShowTaskCardSwimlaneAssigneeAvatar({
        hasAssignee: true,
        showAssigneeAvatar: true,
        task: { assignee: 'feature-draft:abc', localDraftKind: 'comment' },
        variant: 'swimlane',
      })
    ).toBe(false);
  });

  it('скрывает аватар пока задача в драфте', () => {
    expect(
      shouldShowTaskCardSwimlaneAssigneeAvatar({
        hasAssignee: true,
        showAssigneeAvatar: true,
        task: { assignee: 'dev-1', isLocalTask: true, localDraftKind: 'task' },
        variant: 'swimlane',
      })
    ).toBe(false);
  });

  it('скрывает аватар без исполнителя, в сайдбаре и по исполнителям', () => {
    expect(
      shouldShowTaskCardSwimlaneAssigneeAvatar({
        hasAssignee: false,
        showAssigneeAvatar: true,
        task: {},
        variant: 'swimlane',
      })
    ).toBe(false);
    expect(
      shouldShowTaskCardSwimlaneAssigneeAvatar({
        hasAssignee: true,
        showAssigneeAvatar: true,
        task: {},
        variant: 'sidebar',
      })
    ).toBe(false);
    expect(
      shouldShowTaskCardSwimlaneAssigneeAvatar({
        hasAssignee: true,
        showAssigneeAvatar: false,
        task: { localDraftKind: 'comment' },
        variant: 'swimlane',
      })
    ).toBe(false);
  });
});

describe('resolveTaskCardSwimlaneAssigneeAvatarPlacement', () => {
  const visibleTask = {
    hasAssignee: true,
    showAssigneeAvatar: true,
    task: {},
    variant: 'swimlane' as const,
  };

  it('keeps the avatar in the footer when the card is two or more timeslots wide', () => {
    expect(
      resolveTaskCardSwimlaneAssigneeAvatarPlacement({
        ...visibleTask,
        displayDuration: 2,
      })
    ).toBe('footer');
  });

  it('hides the avatar when the card is one timeslot wide', () => {
    expect(
      resolveTaskCardSwimlaneAssigneeAvatarPlacement({
        ...visibleTask,
        displayDuration: 1,
      })
    ).toBe('none');
  });

  it('keeps the avatar in the footer on notes that are wider than one timeslot', () => {
    expect(
      resolveTaskCardSwimlaneAssigneeAvatarPlacement({
        displayDuration: 4,
        hasAssignee: true,
        showAssigneeAvatar: true,
        task: { assignee: 'dev-1', localDraftKind: 'comment' },
        variant: 'swimlane',
      })
    ).toBe('footer');
  });

  it('hides the avatar on one-timeslot notes', () => {
    expect(
      resolveTaskCardSwimlaneAssigneeAvatarPlacement({
        displayDuration: 1,
        hasAssignee: true,
        showAssigneeAvatar: true,
        task: { assignee: 'dev-1', localDraftKind: 'comment' },
        variant: 'swimlane',
      })
    ).toBe('none');
  });

  it('hides the avatar when it should not be shown', () => {
    expect(
      resolveTaskCardSwimlaneAssigneeAvatarPlacement({
        displayDuration: 1,
        hasAssignee: true,
        showAssigneeAvatar: false,
        task: {},
        variant: 'swimlane',
      })
    ).toBe('none');
  });
});

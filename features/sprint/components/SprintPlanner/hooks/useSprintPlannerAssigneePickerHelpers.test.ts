/** @vitest-environment jsdom */

import { describe, expect, it, vi } from 'vitest';

import { applyPhaseAssigneeChange } from './useSprintPlannerAssigneePickerHelpers';

describe('applyPhaseAssigneeChange', () => {
  it('updates the comment assignee without saving a plan position', () => {
    const setComments = vi.fn();
    const savePosition = vi.fn();
    applyPhaseAssigneeChange({
      assigneeId: 'dev-1',
      developers: [{ id: 'dev-1', name: 'Ann', role: 'developer' }],
      position: {
        taskId: 'comment:c1',
        assignee: '',
        duration: 1,
        startDay: 0,
        startPart: 0,
      },
      savePosition,
      setComments,
      setTasks: vi.fn(),
      syncAssignees: true,
      task: { id: 'comment:c1', name: 'Note' } as never,
    });
    expect(savePosition).not.toHaveBeenCalled();
    expect(setComments).toHaveBeenCalledOnce();
  });
});

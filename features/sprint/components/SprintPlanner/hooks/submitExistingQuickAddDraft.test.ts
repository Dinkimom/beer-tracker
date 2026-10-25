import type { Task, TaskPosition } from '@/types';
import type { QueryClient } from '@tanstack/react-query';

import toast from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addIssueToSprint } from '@/lib/api/issues';

import {
  ensureExistingQuickAddFitsSprint,
  existingQuickAddDurationParts,
  submitExistingQuickAddDraft,
} from './submitExistingQuickAddDraft';

vi.mock('@/lib/api/issues', () => ({ addIssueToSprint: vi.fn() }));
vi.mock('@/features/task/hooks/useTasks', () => ({ upsertSprintTaskInQueries: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

function task(storyPoints: number): Task {
  return { id: 'T-1', link: '', name: 'T', team: 'Web', storyPoints };
}

function draftPositions(startDay: number, startPart: number): Map<string, TaskPosition> {
  return new Map([
    [
      'draft-1',
      { assignee: 'dev-1', duration: 1, startDay, startPart, taskId: 'draft-1' },
    ],
  ]);
}

const t = (key: string) => key;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('existingQuickAddDurationParts', () => {
  it('uses the SP duration when it fits', () => {
    expect(existingQuickAddDurationParts(task(5), { startDay: 0, startPart: 0 }, 30)).toBe(5);
  });

  it('keeps the full SP duration when the card ends exactly at the sprint end', () => {
    expect(existingQuickAddDurationParts(task(5), { startDay: 8, startPart: 1 }, 30)).toBe(5);
  });

  it('refuses instead of shortening when the SP duration overflows the sprint', () => {
    expect(existingQuickAddDurationParts(task(5), { startDay: 9, startPart: 1 }, 30)).toBeNull();
    expect(existingQuickAddDurationParts(task(5), { startDay: 9, startPart: 2 }, 30)).toBeNull();
  });
});

describe('ensureExistingQuickAddFitsSprint', () => {
  it('passes a task that fits without a toast', () => {
    expect(
      ensureExistingQuickAddFitsSprint({
        selectedTask: task(5),
        t,
        taskId: 'draft-1',
        taskPositions: draftPositions(0, 0),
        timelineTotalParts: 30,
      })
    ).toBe(true);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('warns and refuses a task that does not fit before the sprint end', () => {
    expect(
      ensureExistingQuickAddFitsSprint({
        selectedTask: task(5),
        t,
        taskId: 'draft-1',
        taskPositions: draftPositions(9, 1),
        timelineTotalParts: 30,
      })
    ).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      'sprintPlanner.swimlane.quickAddMenu.existingDoesNotFitSprint'
    );
  });
});

describe('submitExistingQuickAddDraft', () => {
  it('does not save, swap the draft or add to the sprint when the task does not fit', async () => {
    const savePosition = vi.fn();
    const setTaskPositions = vi.fn();
    const setTasks = vi.fn();

    await submitExistingQuickAddDraft({
      queryClient: {} as QueryClient,
      savePosition,
      selectedSprintId: 7,
      selectedTask: task(5),
      setTaskPositions,
      setTasks,
      t,
      taskId: 'draft-1',
      taskPositions: draftPositions(9, 1),
      timelineTotalParts: 30,
    });

    expect(savePosition).not.toHaveBeenCalled();
    expect(setTaskPositions).not.toHaveBeenCalled();
    expect(setTasks).not.toHaveBeenCalled();
    expect(addIssueToSprint).not.toHaveBeenCalled();
  });

  it('saves the full SP length when the task fits', async () => {
    const savePosition = vi.fn();
    vi.mocked(addIssueToSprint).mockResolvedValue(true);

    await submitExistingQuickAddDraft({
      queryClient: {} as QueryClient,
      savePosition,
      selectedSprintId: 7,
      selectedTask: task(5),
      setTaskPositions: vi.fn(),
      setTasks: vi.fn(),
      t,
      taskId: 'draft-1',
      taskPositions: draftPositions(8, 1),
      timelineTotalParts: 30,
    });

    expect(savePosition).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 5, plannedDuration: 5, startDay: 8, startPart: 1, taskId: 'T-1' }),
      false,
      undefined,
      true
    );
    expect(addIssueToSprint).toHaveBeenCalledWith('T-1', 7);
  });
});

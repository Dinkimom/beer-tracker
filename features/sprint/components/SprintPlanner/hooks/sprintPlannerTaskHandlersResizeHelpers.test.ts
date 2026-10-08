import type { Task, TaskPosition } from '@/types';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { updateIssueWorkForPhase } from '@/lib/beerTrackerApi';
import {
  DEFAULT_PLANNER_TIMELINE_SCALE,
  setActivePlannerTimelineScale,
} from '@/lib/plannerTimelineScale';

import { handleTaskResizeAfterResize } from './sprintPlannerTaskHandlersResizeHelpers';

vi.mock('@/lib/beerTrackerApi', () => ({
  updateIssueWorkForPhase: vi.fn().mockResolvedValue(true),
}));

const mockUpdateIssue = vi.mocked(updateIssueWorkForPhase);

function position(taskId: string, duration: number): TaskPosition {
  return { assignee: 'dev', duration, startDay: 0, startPart: 0, taskId };
}

describe('handleTaskResizeAfterResize', () => {
  beforeEach(() => {
    mockUpdateIssue.mockClear();
    setActivePlannerTimelineScale(DEFAULT_PLANNER_TIMELINE_SCALE);
  });

  afterEach(() => {
    setActivePlannerTimelineScale(DEFAULT_PLANNER_TIMELINE_SCALE);
  });

  it('пересчитывает SP по таблице приведения и шлёт в трекер при syncEstimates', () => {
    const task = { id: 'NW-1', storyPoints: 3 } as Task;
    const tasksMap = new Map([['NW-1', task]]);
    let nextTasks: Task[] = [task];
    const savePosition = vi.fn().mockResolvedValue(undefined);

    handleTaskResizeAfterResize(
      'NW-1',
      6,
      position('NW-1', 6),
      tasksMap,
      new Map(),
      (updater) => {
        nextTasks = updater(nextTasks);
      },
      true,
      savePosition
    );

    expect(nextTasks[0]?.storyPoints).toBe(8);
    expect(mockUpdateIssue).toHaveBeenCalledWith('NW-1', 8, false);
    expect(savePosition).toHaveBeenCalled();
  });

  it('при кастомной шкале всё равно обновляет оценку у карточки «со старой длины»', () => {
    setActivePlannerTimelineScale({ estimateUnit: 'day', timeslotsPerDay: 2 });
    const task = { id: 'NW-1', storyPoints: 3 } as Task;
    const tasksMap = new Map([['NW-1', task]]);
    let nextTasks: Task[] = [task];

    handleTaskResizeAfterResize(
      'NW-1',
      4,
      position('NW-1', 4),
      tasksMap,
      new Map(),
      (updater) => {
        nextTasks = updater(nextTasks);
      },
      false,
      vi.fn().mockResolvedValue(undefined)
    );

    // 4 слота / 2 слота в дне → 2 единицы шкалы → 2 SP
    expect(nextTasks[0]?.storyPoints).toBe(2);
    expect(mockUpdateIssue).not.toHaveBeenCalled();
  });

  it('для локальной задачи обновляет storyPoints без savePosition', () => {
    const task = { id: 'local-1', isLocalTask: true, storyPoints: 1 } as Task;
    const tasksMap = new Map([['local-1', task]]);
    let nextTasks: Task[] = [task];
    const savePosition = vi.fn().mockResolvedValue(undefined);

    handleTaskResizeAfterResize(
      'local-1',
      3,
      position('local-1', 3),
      tasksMap,
      new Map(),
      (updater) => {
        nextTasks = updater(nextTasks);
      },
      true,
      savePosition
    );

    expect(nextTasks[0]?.storyPoints).toBe(3);
    expect(savePosition).not.toHaveBeenCalled();
    expect(mockUpdateIssue).not.toHaveBeenCalled();
  });
});

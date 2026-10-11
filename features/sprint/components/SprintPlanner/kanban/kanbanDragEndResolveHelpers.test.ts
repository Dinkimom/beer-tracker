import type { TransitionItem } from '@/lib/beerTrackerApi';
import type { Task } from '@/types';
import type { BoardColumn } from '@/types/tracker';
import type { DragEndEvent } from '@dnd-kit/core';

import { describe, expect, it, vi } from 'vitest';

import { kanbanColumnId, kanbanTaskId } from './kanbanDndUtils';
import { resolveKanbanDragEndTarget } from './kanbanDragEndResolveHelpers';
import { handleKanbanDragEndStatusChange } from './kanbanViewLaneHelpers';

const doneColumn: BoardColumn = {
  display: 'Done',
  id: '9',
  statusKeys: ['10018', 'Готово', 'готово', '10500', "WON'T BE DONE", "won'tbedone"],
};

const wontBeDone: TransitionItem = {
  display: "WON'T BE DONE",
  id: '7',
  to: { display: "WON'T BE DONE", id: '10500', key: "won'tbedone", statusTypeKey: 'done' },
};

const done: TransitionItem = {
  display: 'Done',
  id: '41',
  to: { display: 'Готово', id: '10018', key: 'готово', statusTypeKey: 'done' },
};

const inProgress: TransitionItem = {
  display: 'In Progress',
  id: '21',
  to: { display: 'В работе', id: '3', key: 'вработе', statusTypeKey: 'inProgress' },
};

function task(originalStatus: string): Task {
  return {
    id: 'RND-1',
    link: '#',
    name: 'Task',
    originalStatus,
    status: 'in-progress',
    team: 'Back',
  };
}

function dragOnto(columnId: string): DragEndEvent {
  return {
    active: { id: kanbanTaskId('RND-1') },
    over: { id: kanbanColumnId(columnId) },
  } as DragEndEvent;
}

describe('resolveKanbanDragEndTarget', () => {
  it('lists every status in the column and keeps board order', () => {
    const target = resolveKanbanDragEndTarget(
      dragOnto('9'),
      [task('вработе')],
      [{ column: doneColumn, tasks: [] }],
      [wontBeDone, inProgress, done]
    );

    expect(target?.transitions.map((transition) => transition.id)).toEqual(['41', '7']);
  });

  it('ignores a drop onto the column the task is already in', () => {
    expect(
      resolveKanbanDragEndTarget(
        dragOnto('9'),
        [task('готово')],
        [{ column: doneColumn, tasks: [] }],
        [wontBeDone, done]
      )
    ).toBeNull();
  });
});

describe('handleKanbanDragEndStatusChange', () => {
  it('asks which status to use when the column has several', () => {
    const onStatusChange = vi.fn();
    const result = handleKanbanDragEndStatusChange(
      dragOnto('9'),
      [task('вработе')],
      [{ column: doneColumn, tasks: [] }],
      [wontBeDone, done],
      onStatusChange
    );

    expect(onStatusChange).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      type: 'choose',
      taskId: 'RND-1',
      transitions: [done, wontBeDone],
    });
  });

  it('applies the only matching transition immediately', () => {
    const onStatusChange = vi.fn();
    const progressColumn: BoardColumn = {
      display: 'In Progress',
      id: '3',
      statusKeys: ['3', 'В работе', 'вработе'],
    };
    const result = handleKanbanDragEndStatusChange(
      dragOnto('3'),
      [task('готовокразработке')],
      [{ column: progressColumn, tasks: [] }],
      [wontBeDone, inProgress, done],
      onStatusChange
    );

    expect(result).toEqual({ type: 'applied', taskId: 'RND-1' });
    expect(onStatusChange).toHaveBeenCalledWith('RND-1', '21', 'вработе', 'В работе', undefined);
  });
});

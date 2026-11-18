import type { Task } from '@/types';
import type { BoardColumn } from '@/types/tracker';

import { describe, expect, it } from 'vitest';

import {
  appendKanbanUnmappedStatusColumns,
  groupKanbanTasksByColumns,
  KANBAN_UNKNOWN_STATUS_COLUMN_ID,
  orderKanbanGroupedColumns,
} from './kanbanGroupTasksHelpers';

const columns: BoardColumn[] = [
  { display: 'Open', id: 'open', statusKeys: ['open'] },
  { display: 'In progress', id: 'progress', statusKeys: ['inProgress'] },
];

function task(id: string, originalStatus?: string, originalStatusDisplay?: string): Task {
  return { id, link: '#', name: id, originalStatus, originalStatusDisplay, team: 'Web' };
}

describe('appendKanbanUnmappedStatusColumns', () => {
  it('adds a column per status the board has no column for, named by the status display', () => {
    const result = appendKanbanUnmappedStatusColumns(columns, [
      task('a', 'needInfo', 'Need info'),
      task('b', 'need_info'),
      task('c', 'review'),
      task('d', 'in-progress'),
      task('e'),
    ]);
    expect(result.slice(2)).toEqual([
      { display: 'Need info', id: 'unmapped-status-needinfo', statusKeys: ['needInfo'] },
      { display: 'review', id: 'unmapped-status-review', statusKeys: ['review'] },
    ]);
  });

  it('returns the board columns as is when every status has a column', () => {
    expect(appendKanbanUnmappedStatusColumns(columns, [task('a', 'open')])).toBe(columns);
  });
});

describe('groupKanbanTasksByColumns', () => {
  it('leaves only tasks without a status in the catch-all column', () => {
    const tasks = [task('a', 'needInfo', 'Need info'), task('b')];
    const kanbanColumns = appendKanbanUnmappedStatusColumns(columns, tasks);
    const ordered = orderKanbanGroupedColumns(groupKanbanTasksByColumns(tasks, kanbanColumns, 'No status'), kanbanColumns);
    expect(ordered.map(({ column, tasks: columnTasks }) => [column.id, columnTasks.map((item) => item.id)])).toEqual([
      ['open', []],
      ['progress', []],
      ['unmapped-status-needinfo', ['a']],
      [KANBAN_UNKNOWN_STATUS_COLUMN_ID, ['b']],
    ]);
  });
});

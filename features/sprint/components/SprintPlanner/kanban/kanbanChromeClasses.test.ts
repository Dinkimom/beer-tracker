import { describe, expect, it } from 'vitest';

import {
  KANBAN_COLUMN_DROP_OK,
  KANBAN_COLUMN_IDLE,
  resolveKanbanColumnChromeClass,
} from './kanbanChromeClasses';

describe('resolveKanbanColumnChromeClass', () => {
  it('highlights drop target when over and allowed', () => {
    expect(resolveKanbanColumnChromeClass(true, false)).toBe(KANBAN_COLUMN_DROP_OK);
  });

  it('keeps idle chrome when drop disabled', () => {
    expect(resolveKanbanColumnChromeClass(true, true)).toBe(KANBAN_COLUMN_IDLE);
  });

  it('keeps idle chrome when not over', () => {
    expect(resolveKanbanColumnChromeClass(false, false)).toBe(KANBAN_COLUMN_IDLE);
  });
});

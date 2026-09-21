import { describe, expect, it, vi } from 'vitest';

import {
  applySprintPresenceBoardView,
  canRevealSprintPresenceViewer,
  formatSprintPresenceViewerTooltip,
  isSprintPresenceBoardView,
  sprintPresenceFocusActionKey,
  toSprintPresenceBoardView,
} from './sprintPresenceBoardView';

describe('sprintPresenceBoardView', () => {
  it('accepts known planner views', () => {
    expect(isSprintPresenceBoardView('kanban')).toBe(true);
    expect(isSprintPresenceBoardView('occupancy')).toBe(true);
    expect(isSprintPresenceBoardView('swimlanes')).toBe(true);
    expect(isSprintPresenceBoardView('full')).toBe(false);
  });

  it('maps compact and full to swimlanes', () => {
    expect(toSprintPresenceBoardView('full')).toBe('swimlanes');
    expect(toSprintPresenceBoardView('compact')).toBe('swimlanes');
    expect(toSprintPresenceBoardView('features')).toBe('swimlanes');
    expect(toSprintPresenceBoardView('kanban')).toBe('kanban');
    expect(toSprintPresenceBoardView('occupancy')).toBe('swimlanes');
  });

  it('keeps the current swimlane density when jumping to swimlanes', () => {
    const setViewMode = vi.fn();
    applySprintPresenceBoardView('kanban', setViewMode);
    expect(setViewMode).toHaveBeenCalledWith('kanban');
    applySprintPresenceBoardView('swimlanes', setViewMode);
    expect(setViewMode).toHaveBeenCalledWith(expect.any(Function));
    const keepCompact = setViewMode.mock.calls[1][0] as (prev: string) => string;
    expect(keepCompact('compact')).toBe('compact');
    expect(keepCompact('features')).toBe('features');
    expect(keepCompact('kanban')).toBe('full');
    applySprintPresenceBoardView('occupancy', setViewMode);
    const hideOccupancy = setViewMode.mock.calls[2][0] as (prev: string) => string;
    expect(hideOccupancy('full')).toBe('full');
    expect(hideOccupancy('kanban')).toBe('full');
  });

  it('formats a tooltip from name, view and action', () => {
    expect(formatSprintPresenceViewerTooltip({ action: null, name: 'Ada', view: null })).toBe('Ada');
    expect(formatSprintPresenceViewerTooltip({ action: null, name: 'Ada', view: 'Kanban' })).toBe(
      'Ada · Kanban'
    );
    expect(
      formatSprintPresenceViewerTooltip({ action: 'moving a card', name: 'Ada', view: 'Kanban' })
    ).toBe('Ada · Kanban · moving a card');
  });

  it('reveals a viewer with a view or a focused card', () => {
    expect(
      canRevealSprintPresenceViewer({ avatarUrl: null, displayName: 'Ada', userId: 'u1' })
    ).toBe(false);
    expect(
      canRevealSprintPresenceViewer({
        avatarUrl: null,
        boardView: 'kanban',
        displayName: 'Ada',
        userId: 'u1',
      })
    ).toBe(true);
    expect(sprintPresenceFocusActionKey('editing')).toBe('editing');
    expect(sprintPresenceFocusActionKey(undefined)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';

import { resolveVisibleBoardViewMode } from './hooksSidebarAndDevelopers';

describe('resolveVisibleBoardViewMode', () => {
  it('maps hidden occupancy to the people swimlane', () => {
    expect(resolveVisibleBoardViewMode('occupancy')).toBe('full');
  });

  it('keeps the other board views', () => {
    expect(resolveVisibleBoardViewMode('features')).toBe('features');
    expect(resolveVisibleBoardViewMode('kanban')).toBe('kanban');
    expect(resolveVisibleBoardViewMode('compact')).toBe('compact');
  });
});

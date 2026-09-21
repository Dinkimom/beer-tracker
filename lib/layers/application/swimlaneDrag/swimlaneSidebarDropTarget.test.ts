import { describe, expect, it } from 'vitest';

import { isSidebarDropTargetAtPointer } from './swimlaneSidebarDropTarget';

describe('isSidebarDropTargetAtPointer', () => {
  const base = {
    sidebarOpen: true,
    sidebarWidth: 320,
    viewportWidth: 1200,
  };

  it('returns true for sidebar-unassigned over id when sidebar is open', () => {
    expect(
      isSidebarDropTargetAtPointer({
        ...base,
        overId: 'sidebar-unassigned',
        pointerX: 100,
      })
    ).toBe(true);
  });

  it('returns false for sidebar-unassigned when sidebar is closed', () => {
    expect(
      isSidebarDropTargetAtPointer({
        ...base,
        sidebarOpen: false,
        overId: 'sidebar-unassigned',
      })
    ).toBe(false);
  });

  it('returns true when pointer is in the right sidebar band', () => {
    expect(
      isSidebarDropTargetAtPointer({
        ...base,
        pointerX: 950,
      })
    ).toBe(true);
  });

  it('returns false when pointer is on the left timeline', () => {
    expect(
      isSidebarDropTargetAtPointer({
        ...base,
        pointerX: 280,
        overlayCenterX: 300,
      })
    ).toBe(false);
  });

  it('returns false when sidebar is closed', () => {
    expect(
      isSidebarDropTargetAtPointer({
        ...base,
        sidebarOpen: false,
        pointerX: 950,
      })
    ).toBe(false);
  });

  it('returns true in layout gap before sidebar DOM', () => {
    expect(
      isSidebarDropTargetAtPointer({
        ...base,
        pointerX: 700,
        swimlanesContentRightEdge: 560,
      })
    ).toBe(true);
  });
});

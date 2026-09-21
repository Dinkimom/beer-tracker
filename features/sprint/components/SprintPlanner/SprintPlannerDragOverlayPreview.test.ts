import { describe, expect, it } from 'vitest';

import { getSwimlaneDragOverlayShellClass } from './SprintPlannerDragOverlayPreview';

describe('getSwimlaneDragOverlayShellClass', () => {
  it('keeps task overlay clip rounded like TaskCard', () => {
    const shell = getSwimlaneDragOverlayShellClass(false);
    expect(shell).toContain('rounded-lg');
    expect(shell).toContain('overflow-hidden');
    expect(shell).not.toContain('rounded-none');
  });

  it('does not clip sticky-note corners with task-card rounding', () => {
    const shell = getSwimlaneDragOverlayShellClass(true);
    expect(shell).toContain('rounded-none');
    expect(shell).not.toContain('rounded-lg');
  });

  it('uses a square photo-frame for image cards', () => {
    const shell = getSwimlaneDragOverlayShellClass(false, true);
    expect(shell).toContain('rounded-none');
    expect(shell).toContain('overflow-visible');
    expect(shell).toContain('h-full');
    expect(shell).not.toContain('rounded-lg');
  });
});

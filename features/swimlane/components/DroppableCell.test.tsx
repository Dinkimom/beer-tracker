/** @vitest-environment jsdom */

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const useDroppable = vi.fn(() => ({
  isOver: false,
  setNodeRef: vi.fn(),
}));

vi.mock('@dnd-kit/core', () => ({
  useDroppable,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('@/features/swimlane/hooks/useDelayedSwimlaneQuickAddHover', () => ({
  useDelayedSwimlaneQuickAddHover: () => ({
    isHovered: false,
    onPointerEnter: vi.fn(),
    onPointerLeave: vi.fn(),
  }),
}));

import { DroppableCell } from './DroppableCell';

afterEach(() => {
  cleanup();
  useDroppable.mockClear();
});

describe('DroppableCell', () => {
  it('does not register useDroppable (hit-test is lane-level + geometry)', () => {
    render(
      <DroppableCell
        partIndex={0}
        partStatus="current"
        taskAreaHeight={40}
        totalHeight={80}
      />
    );

    expect(useDroppable).not.toHaveBeenCalled();
  });

  it('still mounts the cell shell for quick-add / part dividers', () => {
    const { container } = render(
      <DroppableCell
        partIndex={0}
        partStatus="current"
        taskAreaHeight={40}
        totalHeight={80}
        onQuickAddClick={vi.fn()}
      />
    );

    expect(container.querySelector('[data-current-cell="true"]')).not.toBeNull();
    expect(container.querySelector('[data-swimlane-cell-quick-add]')).not.toBeNull();
    expect(useDroppable).not.toHaveBeenCalled();
  });

  it('explains that a card tool does not fit before the sprint end instead of offering +', () => {
    const { container } = render(
      <DroppableCell
        partIndex={2}
        partStatus="future"
        quickAddDoesNotFitSprint
        taskAreaHeight={40}
        totalHeight={80}
      />
    );

    expect(container.querySelector('[data-swimlane-cell-quick-add]')).toBeNull();
    expect(container.firstElementChild?.getAttribute('title')).toBe(
      'sprintPlanner.swimlane.quickAddMenu.kindDoesNotFitSprint'
    );
  });
});

/** @vitest-environment jsdom */

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

import { getPartsPerDay } from '@/constants';

import { TimelineGridPartCell } from './TimelineGridPartCell';

afterEach(() => {
  cleanup();
});

function renderLastCell(quickAddMustFitSprint: boolean) {
  return render(
    <TimelineGridPartCell
      dayCount={10}
      dayIndex={9}
      developerId="dev-1"
      isDraggingTask={false}
      partDividerVisible={false}
      partIndex={getPartsPerDay() - 1}
      quickAddDurationCells={2}
      quickAddMustFitSprint={quickAddMustFitSprint}
      quickAddSpan={1}
      sprintStartDate={new Date(2025, 0, 6)}
      taskAreaHeight={80}
      totalHeight={80}
      onQuickAddTask={vi.fn()}
    />
  );
}

describe('TimelineGridPartCell', () => {
  it('offers no + for a photo/diagram footprint that would overflow the sprint', () => {
    const { container } = renderLastCell(true);

    expect(container.querySelector('[data-swimlane-cell-quick-add]')).toBeNull();
    expect(container.firstElementChild?.getAttribute('title')).toBe(
      'sprintPlanner.swimlane.quickAddMenu.kindDoesNotFitSprint'
    );
  });

  it('keeps the + for footprints that may be clamped (e.g. widgets)', () => {
    const { container } = renderLastCell(false);

    expect(container.querySelector('[data-swimlane-cell-quick-add]')).not.toBeNull();
    expect(container.firstElementChild?.getAttribute('title')).toBeNull();
  });
});

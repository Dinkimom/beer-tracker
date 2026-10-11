/** @vitest-environment jsdom */

import type { Task } from '@/types';

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TaskCardDueDateChip, TaskCardDueDateContext } from './TaskCardDueDateChip';

vi.mock('@/contexts/LanguageContext', () => ({
  useI18n: () => ({
    language: 'ru',
    t: (key: string, params?: Record<string, string>) =>
      params?.date ? `${key}:${params.date}` : key,
  }),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function task(patch: Partial<Task>): Task {
  return {
    id: 'AQA-363',
    link: 'https://example.test/AQA-363',
    name: 'Autotests',
    team: 'Web',
    ...patch,
  };
}

describe('TaskCardDueDateChip', () => {
  it('stays hidden outside the kanban scope and without a deadline', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 11, 12, 0, 0));

    const { rerender } = render(<TaskCardDueDateChip task={task({ deadline: '2026-10-14' })} />);
    expect(screen.queryByText('14 окт. 2026 г.')).toBeNull();

    rerender(
      <TaskCardDueDateContext.Provider value={true}>
        <TaskCardDueDateChip task={task({})} />
      </TaskCardDueDateContext.Provider>
    );
    expect(screen.queryByText('14 окт. 2026 г.')).toBeNull();
  });

  it('shows a calendar chip while the date is ahead', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 11, 12, 0, 0));

    render(
      <TaskCardDueDateContext.Provider value={true}>
        <TaskCardDueDateChip task={task({ deadline: '2026-10-14', status: 'in-progress' })} />
      </TaskCardDueDateContext.Provider>
    );

    const chip = screen.getByText('14 окт. 2026 г.');
    expect(chip.getAttribute('data-due-state')).toBe('scheduled');
    expect(chip.getAttribute('aria-label')).toBe('sprintPlanner.kanban.dueDate:14 окт. 2026 г.');
    expect(chip.className).toContain('border-gray-300');
    expect(chip.querySelector('svg')).toBeTruthy();
  });

  it('shows a red chip when the date has passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 11, 12, 0, 0));

    render(
      <TaskCardDueDateContext.Provider value={true}>
        <TaskCardDueDateChip task={task({ deadline: '2026-09-10', status: 'todo' })} />
      </TaskCardDueDateContext.Provider>
    );

    const chip = screen.getByText('10 сент. 2026 г.');
    expect(chip.getAttribute('data-due-state')).toBe('overdue');
    expect(chip.className).toContain('text-red-600');
    expect(chip.className).not.toContain('text-gray-800');
  });
});

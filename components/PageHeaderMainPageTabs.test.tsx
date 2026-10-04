/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PageHeaderMainPageTabs } from './PageHeaderMainPageTabs';

afterEach(() => {
  cleanup();
});

describe('PageHeaderMainPageTabs', () => {
  const items = [
    { id: 'backlog' as const, label: 'Бэклог' },
    { id: 'board' as const, label: 'Доска' },
    { id: 'burndown' as const, label: 'Диаграмма сгорания' },
  ];

  it('marks the active tab and calls onChange for another tab', () => {
    const onChange = vi.fn();

    render(
      <PageHeaderMainPageTabs
        activeId="board"
        ariaLabel="Sprint Tabs"
        items={items}
        onChange={onChange}
      />
    );

    expect(screen.getByRole('navigation', { name: 'Sprint Tabs' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Доска' }).getAttribute('aria-current')).toBe(
      'page'
    );
    expect(screen.getByRole('button', { name: 'Бэклог' }).getAttribute('aria-current')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Бэклог' }));
    expect(onChange).toHaveBeenCalledWith('backlog');
  });

  it('shows a label on every tab and the short label when one is set', () => {
    render(
      <PageHeaderMainPageTabs
        activeId="burndown"
        ariaLabel="Sprint Tabs"
        items={[
          { id: 'board', icon: 'timeline', label: 'Доска' },
          {
            id: 'burndown',
            icon: 'trend-down',
            label: 'Диаграмма сгорания',
            shortLabel: 'Сгорание',
          },
        ]}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Доска' }).textContent).toContain('Доска');
    expect(screen.getByRole('button', { name: 'Диаграмма сгорания' }).textContent).toContain(
      'Сгорание'
    );
  });
});

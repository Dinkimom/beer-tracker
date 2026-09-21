/** @vitest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PageHeaderMainPageTabs } from './PageHeaderMainPageTabs';

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
});

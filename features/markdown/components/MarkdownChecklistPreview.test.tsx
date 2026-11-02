/** @vitest-environment jsdom */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MarkdownChecklistPreview } from './MarkdownChecklistPreview';

describe('MarkdownChecklistPreview', () => {
  it('renders mention badges inside checklist items', () => {
    render(
      <MarkdownChecklistPreview
        markdown="- [ ] Ask @[Anna Petrova](dev-1) to review"
        variant="card"
      />
    );

    expect(screen.getByText('@Anna Petrova')).toBeTruthy();
    expect(screen.queryByText(/@\[Anna Petrova\]\(dev-1\)/)).toBeNull();
  });

  it('renders mention badges on heading, bullet and plain lines next to a checklist', () => {
    render(
      <MarkdownChecklistPreview
        markdown={[
          '## cc @[Ivan Sidorov](dev-2)',
          '- follow up with @[Anna Petrova](dev-1)',
          'ping @[Anna Petrova](dev-1)',
          '- [x] done',
        ].join('\n')}
        variant="card"
      />
    );

    expect(screen.getByText('@Ivan Sidorov')).toBeTruthy();
    expect(screen.getAllByText('@Anna Petrova').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/@\[Anna Petrova\]\(dev-1\)/)).toBeNull();
    expect(screen.queryByText(/@\[Ivan Sidorov\]\(dev-2\)/)).toBeNull();
  });

  it('renders inline formatting and keeps mentions inside it', () => {
    const { container } = render(
      <MarkdownChecklistPreview
        markdown={['# Release', '- [ ] **ping @[Anna Petrova](dev-1)** about `v2` ~~later~~'].join('\n')}
        variant="card"
      />
    );

    expect(container.querySelector('h1')?.className).toContain('text-base');
    const strong = container.querySelector('strong');
    expect(strong?.textContent).toContain('@Anna Petrova');
    expect(strong?.textContent).not.toContain('**');
    expect(container.querySelector('code')?.textContent).toBe('v2');
    expect(container.querySelector('s')?.textContent).toBe('later');
  });

  it('lets pointer down on checklist text reach the card, but not on the checkbox', () => {
    const onCardPointerDown = vi.fn();
    const onMarkdownChange = vi.fn();
    const { container } = render(
      <div onPointerDown={onCardPointerDown}>
        <MarkdownChecklistPreview
          markdown="- [ ] drag me"
          variant="card"
          onMarkdownChange={onMarkdownChange}
        />
      </div>
    );

    fireEvent.pointerDown(within(container).getByText('drag me'));
    expect(onCardPointerDown).toHaveBeenCalledTimes(1);

    const checkbox = within(container).getByRole('checkbox');
    fireEvent.pointerDown(checkbox);
    expect(onCardPointerDown).toHaveBeenCalledTimes(1);

    fireEvent.click(checkbox);
    expect(onMarkdownChange).toHaveBeenCalledWith('- [x] drag me');
  });
});

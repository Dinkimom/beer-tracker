/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
});

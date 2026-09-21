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
});

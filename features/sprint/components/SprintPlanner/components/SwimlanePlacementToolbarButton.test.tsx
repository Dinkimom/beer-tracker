/** @vitest-environment jsdom */

import type { IssueTrackerProviderKind } from '@/lib/issueTrackerProvider/types';

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useIssueTrackerProviderKind } from '@/contexts/IssueTrackerProviderKindContext';

import { SwimlanePlacementToolbarButton } from './SwimlanePlacementToolbarButton';

vi.mock('@/contexts/LanguageContext', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('@/contexts/IssueTrackerProviderKindContext', () => ({
  useIssueTrackerProviderKind: vi.fn(),
}));

vi.mock('@/hooks/useDocumentDarkClass', () => ({
  useDocumentDarkClass: () => false,
}));

function renderTaskButton(kind: IssueTrackerProviderKind) {
  vi.mocked(useIssueTrackerProviderKind).mockReturnValue(kind);
  return render(
    <SwimlanePlacementToolbarButton
      active={false}
      showSeparatorBefore={false}
      tool="task"
      onSelect={() => undefined}
    />
  );
}

describe('SwimlanePlacementToolbarButton task icon', () => {
  it('uses the Tracker T when the provider is Yandex Tracker', () => {
    const { container } = renderTaskButton('tracker');
    expect(container.querySelectorAll('rect')).toHaveLength(5);
    expect(container.querySelectorAll('path')).toHaveLength(0);
  });

  it('uses the Jira diamond when the provider is Jira', () => {
    const { container } = renderTaskButton('jira-cloud');
    expect(container.querySelectorAll('path')).toHaveLength(3);
    expect(container.querySelectorAll('rect')).toHaveLength(0);
  });

  it('puts the Cmd/Ctrl shortcut into the accessible name', () => {
    const { container } = renderTaskButton('tracker');
    expect(container.querySelector('button')?.getAttribute('aria-label')).toMatch(
      /sprintPlanner\.swimlane\.placementToolbar\.task \((⌘|Ctrl)\+3\)/
    );
  });
});

import { describe, expect, it, vi } from 'vitest';

import { listSprintGoalTexts } from './sprintGoalsRepository';
import { formatSprintGoalsForTracker, syncSprintGoalsToTracker } from './sprintGoalsTrackerSync';

vi.mock('@/lib/issueTrackerProvider/clientFactory', () => ({
  getIssueTrackerProviderClientFromRequest: vi.fn(),
}));
vi.mock('./sprintGoalsRepository', () => ({
  listSprintGoalTexts: vi.fn(),
}));

describe('formatSprintGoalsForTracker', () => {
  it('lists goals of one kind without a heading', () => {
    expect(
      formatSprintGoalsForTracker([
        { goal_type: 'delivery', text: ' Ship checkout ' },
        { goal_type: 'delivery', text: 'Fix login' },
      ])
    ).toBe('- Ship checkout\n- Fix login');
  });

  it('splits Delivery and Discovery when both are present', () => {
    expect(
      formatSprintGoalsForTracker([
        { goal_type: 'discovery', text: 'Research billing' },
        { goal_type: 'delivery', text: 'Ship checkout' },
        { goal_type: 'delivery', text: '  ' },
      ])
    ).toBe('Delivery:\n- Ship checkout\n\nDiscovery:\n- Research billing');
  });

  it('returns an empty goal when there are no goals', () => {
    expect(formatSprintGoalsForTracker([])).toBe('');
  });
});

describe('syncSprintGoalsToTracker', () => {
  it('writes the formatted goals to a Jira sprint', async () => {
    vi.mocked(listSprintGoalTexts).mockResolvedValue([{ goal_type: 'delivery', text: 'Ship checkout' }]);
    const updateSprintGoal = vi.fn(() => Promise.resolve());
    await syncSprintGoalsToTracker({
      getIssueTracker: () => Promise.resolve({ providerKind: 'jira-cloud', updateSprintGoal } as never),
      sprintId: 42,
    });
    expect(listSprintGoalTexts).toHaveBeenCalledWith({ sprintId: 42 });
    expect(updateSprintGoal).toHaveBeenCalledWith(42, '- Ship checkout');
  });

  it('skips trackers other than Jira', async () => {
    const updateSprintGoal = vi.fn(() => Promise.resolve());
    await syncSprintGoalsToTracker({
      getIssueTracker: () => Promise.resolve({ providerKind: 'tracker', updateSprintGoal } as never),
      sprintId: 42,
    });
    expect(updateSprintGoal).not.toHaveBeenCalled();
  });

  it('does not throw when Jira rejects the update', async () => {
    vi.mocked(listSprintGoalTexts).mockResolvedValue([]);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(
      syncSprintGoalsToTracker({
        getIssueTracker: () =>
          Promise.resolve({
            providerKind: 'jira-onprem',
            updateSprintGoal: () => Promise.reject(new Error('403')),
          } as never),
        sprintId: 42,
      })
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

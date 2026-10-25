import { describe, expect, it } from 'vitest';

import { resolveTaskPointsForTeam } from './pointsUtils';

describe('resolveTaskPointsForTeam', () => {
  it('uses test points for a QA card, falling back to 1', () => {
    expect(resolveTaskPointsForTeam({ team: 'QA', storyPoints: 0, testPoints: 3 })).toBe(3);
    expect(resolveTaskPointsForTeam({ team: 'QA', storyPoints: 5, testPoints: 0 })).toBe(1);
  });

  it('uses story points for a QA card when the integration hides test points', () => {
    expect(
      resolveTaskPointsForTeam({ team: 'QA', hideTestPointsByIntegration: true, storyPoints: 4, testPoints: 2 })
    ).toBe(4);
    expect(resolveTaskPointsForTeam({ team: 'QA', hideTestPointsByIntegration: true, storyPoints: 0 })).toBe(1);
  });

  it('prefers test points for testing-only tasks, then story points', () => {
    expect(
      resolveTaskPointsForTeam({ team: 'Web', testingOnlyByIntegrationRules: true, storyPoints: 5, testPoints: 2 })
    ).toBe(2);
    expect(
      resolveTaskPointsForTeam({ team: 'Web', testingOnlyByIntegrationRules: true, storyPoints: 5, testPoints: 0 })
    ).toBe(5);
    expect(resolveTaskPointsForTeam({ team: 'Web', testingOnlyByIntegrationRules: true })).toBe(1);
  });

  it('uses test points for a QA-only dev task (0 SP, TP > 0)', () => {
    expect(resolveTaskPointsForTeam({ team: 'Web', storyPoints: 0, testPoints: 3 })).toBe(3);
  });

  it('uses story points for a regular dev task, falling back to 1', () => {
    expect(resolveTaskPointsForTeam({ team: 'Web', storyPoints: 5, testPoints: 3 })).toBe(5);
    expect(resolveTaskPointsForTeam({ team: 'Web' })).toBe(1);
  });
});

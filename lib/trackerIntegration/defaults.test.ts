import { describe, expect, it } from 'vitest';

import { buildDefaultTrackerIntegrationStored } from './defaults';

describe('buildDefaultTrackerIntegrationStored', () => {
  it('returns preconfigured integration for new organization', () => {
    expect(buildDefaultTrackerIntegrationStored()).toEqual({
      configRevision: 0,
      platform: {
        fieldId: 'functionalTeam',
        source: 'field',
        valueMap: [
          { platform: 'Web', trackerValue: 'frontend' },
          { platform: 'Back', trackerValue: 'backend' },
          { platform: 'QA', trackerValue: 'qa' },
          { platform: 'DevOps', trackerValue: 'mobile' },
        ],
      },
      testingFlow: {
        devAssigneeFieldId: 'assignee',
        devEstimateFieldId: 'storyPoints',
        qaEngineerFieldId: 'qaEngineer',
        qaEstimateFieldId: 'testPoints',
        embeddedTestingOnlyRules: [
          { fieldId: 'testPoints', operator: 'gt', value: '0' },
          { fieldId: 'functionalTeam', operator: 'eq', value: 'qa' },
        ],
        embeddedTestingOnlyJoins: ['and'],
      },
    });
  });

  it('uses provided revision', () => {
    expect(buildDefaultTrackerIntegrationStored(7).configRevision).toBe(7);
  });
});

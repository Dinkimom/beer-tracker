import { describe, expect, it } from 'vitest';

import { buildIssueWorkEstimatePatch } from './buildIssueWorkPatch';

describe('buildIssueWorkEstimatePatch', () => {
  it('uses default field keys without integration', () => {
    expect(buildIssueWorkEstimatePatch(null, { storyPoints: 3, testPoints: 5 })).toEqual({
      storyPoints: 3,
      testPoints: 5,
    });
  });

  it('maps custom field ids from testingFlow', () => {
    const integration = {
      configRevision: 1,
      testingFlow: {
        devEstimateFieldId: 'customSp',
        qaEstimateFieldId: 'customTp',
      },
    };
    expect(buildIssueWorkEstimatePatch(integration, { storyPoints: 2, testPoints: null })).toEqual({
      customFields: {
        customSp: 2,
        customTp: null,
      },
    });
  });
});

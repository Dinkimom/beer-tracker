import { describe, expect, it } from 'vitest';

import { toPlannerIntegrationRulesDto } from './toPlannerDto';

describe('toPlannerIntegrationRulesDto', () => {
  it('reports estimate fields as unmapped without a saved config', () => {
    expect(toPlannerIntegrationRulesDto(null).estimateFields).toEqual({
      devMapped: false,
      qaMapped: false,
    });
  });

  it('marks an estimate field mapped only when its id is set', () => {
    expect(
      toPlannerIntegrationRulesDto({
        configRevision: 2,
        testingFlow: {
          devEstimateFieldId: 'customfield_10016',
          qaEstimateFieldId: '  ',
        },
      }).estimateFields
    ).toEqual({ devMapped: true, qaMapped: false });
  });
});

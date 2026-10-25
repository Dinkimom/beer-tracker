import { describe, expect, it } from 'vitest';

import { toPlannerIntegrationRulesDto } from './toPlannerDto';

const completion = { requireResolution: true, statusTypeByKey: {} };

describe('toPlannerIntegrationRulesDto', () => {
  it('reports estimate fields as unmapped without a saved config', () => {
    expect(toPlannerIntegrationRulesDto(null, completion).estimateFields).toEqual({
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
      }, completion).estimateFields
    ).toEqual({ devMapped: true, qaMapped: false });
  });
});

import { describe, expect, it } from 'vitest';

import { buildEmbeddedTestingAutoDefaultsUpdate } from './useTrackerIntegrationFormAutoDefaultsHelpers';

const fieldRows = [
  {
    id: 'customfield_10034',
    key: 'customfield_10034',
    schemaType: 'number',
  },
  {
    display: 'QA estimates',
    id: 'customfield_10768',
    key: 'customfield_10768',
    schemaType: 'number',
  },
  {
    id: 'team',
    key: 'functionalTeam',
    options: ['qa', 'frontend'],
  },
];

const mapping = {
  devEstimateFieldId: 'customfield_10034',
  platformFieldId: 'team',
  qaEstimateFieldId: 'customfield_10768',
};

describe('buildEmbeddedTestingAutoDefaultsUpdate', () => {
  it('fills empty rules from the mapped estimate and platform fields', () => {
    const update = buildEmbeddedTestingAutoDefaultsUpdate(
      fieldRows,
      [{ platform: 'QA', trackerValue: 'qa' }],
      ['qa', 'frontend'],
      [],
      [],
      mapping,
      false,
    );

    expect(update).toEqual({
      desiredJoins: ['and'],
      desiredRules: [
        { fieldId: 'customfield_10768', operator: 'gt', value: '0' },
        { fieldId: 'functionalTeam', operator: 'eq', value: 'qa' },
      ],
      shouldApply: true,
    });
  });

  it('does not recreate rules the user cleared', () => {
    expect(
      buildEmbeddedTestingAutoDefaultsUpdate(
        fieldRows,
        [],
        [],
        [],
        [],
        mapping,
        true,
      ),
    ).toBeNull();
  });

  it('rebinds unresolved canonical fields and keeps the chosen operator', () => {
    const update = buildEmbeddedTestingAutoDefaultsUpdate(
      fieldRows,
      [],
      [],
      [
        { fieldId: 'testPoints', operator: 'eq', value: '0' },
        { fieldId: 'functionalTeam', operator: 'eq', value: 'qa' },
      ],
      ['and'],
      mapping,
      true,
    );

    expect(update?.desiredRules).toEqual([
      { fieldId: 'customfield_10768', operator: 'eq', value: '0' },
      { fieldId: 'functionalTeam', operator: 'eq', value: 'qa' },
    ]);
    expect(update?.desiredJoins).toEqual(['and']);
  });
});

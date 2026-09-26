import { describe, expect, it } from 'vitest';

import { translate } from '@/lib/i18n/translator';

import {
  normalizeRuleForFieldRow,
  operatorOptionsForFieldRow,
  rebindEmbeddedTestingRuleFieldId,
} from './embeddedTestingRuleFieldHelpers';

const t = (key: string) => translate('ru', key);

describe('operatorOptionsForFieldRow', () => {
  it('list field only allows eq', () => {
    expect(
      operatorOptionsForFieldRow(
        {
          id: 'x',
          options: ['a', 'b'],
          schemaType: 'string',
        },
        t,
      ),
    ).toEqual([{ label: translate('ru', 'admin.plannerIntegration.operator.eq'), value: 'eq' }]);
  });

  it('numeric field allows comparison ops', () => {
    const opts = operatorOptionsForFieldRow(
      {
        id: 'storypoints',
        schemaType: 'integer',
      },
      t,
    );
    expect(opts.map((o) => o.value)).toEqual(['eq', 'gt', 'gte', 'lt', 'lte']);
  });

  it('unknown field keeps comparison ops so Equals is not a dead end', () => {
    expect(operatorOptionsForFieldRow(undefined, t).map((o) => o.value)).toEqual([
      'eq',
      'gt',
      'gte',
      'lt',
      'lte',
    ]);
  });
});

describe('normalizeRuleForFieldRow', () => {
  it('resets operator when not allowed for list field', () => {
    const row = { id: 'f', options: ['x'], schemaType: 'string' };
    expect(
      normalizeRuleForFieldRow(
        row,
        {
          fieldId: 'f',
          operator: 'gt',
          value: 'x',
        },
        t,
      ),
    ).toEqual({ fieldId: 'f', operator: 'eq', value: 'x' });
  });

  it('keeps a comparison operator when the field row is not loaded yet', () => {
    expect(
      normalizeRuleForFieldRow(
        undefined,
        { fieldId: 'testPoints', operator: 'gt', value: '0' },
        t,
      ),
    ).toEqual({ fieldId: 'testPoints', operator: 'gt', value: '0' });
  });

  it('clears value when not in list options', () => {
    const row = { id: 'f', options: ['a'], schemaType: 'string' };
    expect(
      normalizeRuleForFieldRow(
        row,
        {
          fieldId: 'f',
          operator: 'eq',
          value: 'nope',
        },
        t,
      ),
    ).toEqual({ fieldId: 'f', operator: 'eq', value: '' });
  });
});

describe('rebindEmbeddedTestingRuleFieldId', () => {
  const rows = [
    { id: 'customfield_10768', key: 'customfield_10768', schemaType: 'number' },
    { id: 'functionalTeam', key: 'functionalTeam', options: ['qa', 'frontend'] },
  ];
  const mapping = {
    devEstimateFieldId: 'customfield_10034',
    platformFieldId: 'functionalTeam',
    qaEstimateFieldId: 'customfield_10768',
  };

  it('replaces an unresolved canonical id with the mapped field', () => {
    expect(rebindEmbeddedTestingRuleFieldId('testPoints', rows, mapping)).toBe(
      'customfield_10768',
    );
  });

  it('leaves a field that already matches a tracker row', () => {
    expect(rebindEmbeddedTestingRuleFieldId('customfield_10768', rows, mapping)).toBe(
      'customfield_10768',
    );
  });

  it('leaves an unknown id that is not a canonical placeholder', () => {
    expect(rebindEmbeddedTestingRuleFieldId('customfield_1', rows, mapping)).toBe(
      'customfield_1',
    );
  });

  it('replaces functionalTeam when that id is not a tracker field', () => {
    const jiraRows = [
      { id: 'customfield_10768', key: 'customfield_10768' },
      { id: 'customfield_team', key: 'customfield_team', options: ['qa'] },
    ];
    expect(
      rebindEmbeddedTestingRuleFieldId('functionalTeam', jiraRows, {
        ...mapping,
        platformFieldId: 'customfield_team',
      }),
    ).toBe('customfield_team');
  });
});

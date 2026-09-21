import { describe, expect, it } from 'vitest';

import { translate } from '@/lib/i18n/translator';

import {
  normalizeRuleForFieldRow,
  operatorOptionsForFieldRow,
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
